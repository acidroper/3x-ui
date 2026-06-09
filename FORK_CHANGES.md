# Custom Modifications in 3x-ui Fork

This document provides a comprehensive summary of the custom modifications, architecture, and code changes introduced in this fork relative to the upstream repository.

The primary essence and feature of this fork is the addition of **client-side `xmux` parameter overrides** for the `VLESS` protocol over the `xhttp` transport network.

Additionally, this fork includes a minor structural update to the React Router configuration to ensure proper sidebar navigation in the panel.

---

## 📂 Overview of Modified Files

The custom changes are isolated to exactly **9 files**:

| File Path | Description | Role |
| :--- | :--- | :--- |
| [`web/service/inbound.go`](file:///home/andrey/sources/3x-ui/web/service/inbound.go) | Backend Inbounds Service | Exposes the inbound `Network` property in the lightweight projection sent to the client picker dropdowns. |
| [`frontend/src/schemas/protocols/stream/xhttp.ts`](file:///home/andrey/sources/3x-ui/frontend/src/schemas/protocols/stream/xhttp.ts) | Stream Transport Schema | Registers `uiXmuxEnabled` and `uiXmuxSettings` fields to pass frontend validations during inbound save operations. |
| [`frontend/src/pages/inbounds/InboundFormModal.tsx`](file:///home/andrey/sources/3x-ui/frontend/src/pages/inbounds/InboundFormModal.tsx) | Inbound Form Modal (UI) | Form UI for managing the default inbound-level `uiXmuxSettings` parameters. |
| [`frontend/src/schemas/client.ts`](file:///home/andrey/sources/3x-ui/frontend/src/schemas/client.ts) | Frontend Zod Schemas | Adds validation schemas for client-side `xmuxOverride` parameters. |
| [`frontend/src/pages/clients/ClientFormModal.tsx`](file:///home/andrey/sources/3x-ui/frontend/src/pages/clients/ClientFormModal.tsx) | Client Form Modal (UI) | Form UI for managing individual client `xmux` overrides. |
| [`frontend/src/pages/clients/ClientBulkAddModal.tsx`](file:///home/andrey/sources/3x-ui/frontend/src/pages/clients/ClientBulkAddModal.tsx) | Bulk Client Form Modal (UI) | Form UI for managing `xmux` overrides when bulk-adding clients. |
| [`sub/subService.go`](file:///home/andrey/sources/3x-ui/sub/subService.go) | Subscription Link Generator | Appends the overridden `xmux` parameters into the `extra` field of the generated VLESS subscription link. |
| [`sub/subJsonService.go`](file:///home/andrey/sources/3x-ui/sub/subJsonService.go) | JSON Subscription Generator | Cleans UI-only flags and injects the overriding `xmux` configuration into the generated Xray JSON client config. |
| [`web/service/xray.go`](file:///home/andrey/sources/3x-ui/web/service/xray.go) | Xray Configuration Generator | Filters out internal UI-only config fields (`uiXmuxEnabled`, `uiXmuxSettings`) before passing configuration to the Xray binary. |

---

## 🛠️ Core Feature: Client-Side XMUX Parameter Overrides

This feature allows setting custom multiplexing (`xmux`) parameters on a per-client level. These parameters are injected into the generated `VLESS` client subscription URLs so that client applications (like v2rayN, Nekobox, Sing-box, etc.) can parse and apply the customized client-side multiplexing options for `xhttp` connections.

### 1. Frontend Schemas & Types
In **`frontend/src/schemas/client.ts`**, we added `xmuxOverride` configurations to `ClientRecordSchema`, `ClientFormSchema`, and `ClientBulkAddFormSchema`:

```typescript
export const ClientRecordSchema = z.object({
  // ... existing fields ...
  xmuxOverride: z.object({
    enabled: z.boolean().optional(),
    maxConcurrency: z.union([z.string(), z.number()]).optional(),
    maxConnections: z.union([z.string(), z.number()]).optional(),
    cMaxReuseTimes: z.union([z.string(), z.number()]).optional(),
    hMaxRequestTimes: z.union([z.string(), z.number()]).optional(),
    hMaxReusableSecs: z.union([z.string(), z.number()]).optional(),
    hKeepAlivePeriod: z.union([z.string(), z.number()]).optional(),
  }).loose().optional(),
  // ...
});
```

### 2. Client Management Forms (UI)
In **`ClientFormModal.tsx`** and **`ClientBulkAddModal.tsx`**, the XMUX Overrides UI section is shown dynamically **only** when the selected inbound protocols include `VLESS` over an `xhttp` network:

* **Detection Logic:**
  ```typescript
  const xmuxCapableIds = useMemo(() => {
    const ids = new Set<number>();
    for (const row of inbounds || []) {
      if (row && row.protocol === 'vless' && row.network === 'xhttp') {
        ids.add(row.id);
      }
    }
    return ids;
  }, [inbounds]);

  const showXmuxOverride = useMemo(
    () => (form.inboundIds || []).some((id) => xmuxCapableIds.has(id)),
    [form.inboundIds, xmuxCapableIds],
  );
  ```

* **Mutual Exclusion:**
  To maintain validity, `maxConcurrency` and `maxConnections` are mutually exclusive. Selecting or typing in one disables the other.
* **Fields added:**
  * `maxConcurrency` (e.g. `16-32`)
  * `maxConnections` (e.g. `0`)
  * `cMaxReuseTimes` (e.g. `64-128`)
  * `hMaxRequestTimes` (e.g. `700-900`)
  * `hMaxReusableSecs` (e.g. `1800-3000`)
  * `hKeepAlivePeriod` (e.g. `0`)

### 3. Subscription Link Generation (Go Backend)
In **`sub/subService.go`**, when generating subscription links, if the network type is `xhttp`, the generator parses the client's `extra` JSON field. If `xmuxOverride` is enabled, it cleans and merges the values with the default inbound-level `xmux` settings, serializes them, and attaches them to the generated VLESS connection string as `&extra={"xmux":{...}}`:

```go
if streamNetwork == "xhttp" {
    xhttp, _ := stream["xhttpSettings"].(map[string]any)
    var finalXmux map[string]any

    uiXmuxEnabled, _ := xhttp["uiXmuxEnabled"].(bool)
    if uiXmuxEnabled {
        if uiXmuxSettings, ok := xhttp["uiXmuxSettings"].(map[string]any); ok {
            finalXmux = make(map[string]any)
            for k, v := range uiXmuxSettings {
                finalXmux[k] = v
            }
        }
    }

    rawClients, ok := settings["clients"].([]any)
    if ok {
        for _, rc := range rawClients {
            rcMap, ok := rc.(map[string]any)
            if ok && rcMap["email"] == email {
                if xmuxOverride, ok := rcMap["xmuxOverride"].(map[string]any); ok {
                    if enabled, _ := xmuxOverride["enabled"].(bool); enabled {
                        if finalXmux == nil {
                            finalXmux = make(map[string]any)
                        }
                        for k, v := range xmuxOverride {
                            if k != "enabled" {
                                finalXmux[k] = v
                            }
                        }
                    }
                }
                break
            }
        }
    }

    if finalXmux != nil {
        cleanXmux := make(map[string]any)
        for k, v := range finalXmux {
            if v == nil || k == "enabled" {
                continue
            }
            if strVal, isStr := v.(string); isStr && strVal == "" {
                continue
            }
            cleanXmux[k] = v
        }
        if len(cleanXmux) > 0 {
            extraData := map[string]any{"xmux": cleanXmux}
            bz, _ := json.Marshal(extraData)
            params["extra"] = string(bz)
        }
    }
}
```

### 4. JSON Subscription & Xray Configuration Sanitizer
When generating a raw JSON Xray configuration for the server process (in `web/service/xray.go`), or when a user downloads the client subscription in JSON format (in `sub/subJsonService.go`), the internal UI-only custom properties (`uiXmuxEnabled` and `uiXmuxSettings`) are stripped from `xhttpSettings`.

In `subJsonService.go` specifically, the client's `xmuxOverride` logic identical to the link generation is executed to dynamically construct a clean `"xmux": {...}` object inside `xhttpSettings` tailored for that specific client, guaranteeing they receive their custom multiplexing rules even when consuming full JSON subscriptions.

### 5. Inbound-Level Default XMUX Options
In addition to individual client overrides, the panel allows configuring default client-side XMUX settings at the inbound level (inside the `xhttp` transport options of the VLESS inbound). These options are propagated automatically to all clients attached to the inbound who do not have a custom override.

* **Frontend Form UI (`InboundFormModal.tsx`):**
  Exposes the inbound-level "XMUX (client-side)" controls mapped to `uiXmuxEnabled` and `uiXmuxSettings`:
  * `maxConcurrency` (e.g. `16-32`)
  * `maxConnections` (e.g. `0`)
  * `cMaxReuseTimes` (e.g. `64-128`)
  * `hMaxRequestTimes` (e.g. `700-900`)
  * `hMaxReusableSecs` (e.g. `1800-3000`)
  * `hKeepAlivePeriod` (e.g. `0`)
  
* **Schema Validation (`xhttp.ts`):**
  Includes `uiXmuxEnabled` and `uiXmuxSettings` fields inside the inbound `XHttpStreamSettingsSchema` to allow correct form validation:
  ```typescript
  uiXmuxEnabled: z.boolean().optional(),
  uiXmuxSettings: XHttpXmuxSchema.optional(),
  ```

---

