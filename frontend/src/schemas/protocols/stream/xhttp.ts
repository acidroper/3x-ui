import { z } from 'zod';

import { WsHeaderMapSchema } from '@/schemas/protocols/stream/ws';

export const XHttpModeSchema = z.enum(['auto', 'packet-up', 'stream-up', 'stream-one']);
export type XHttpMode = z.infer<typeof XHttpModeSchema>;

// xHTTP (SplitHTTPConfig) is xray-core's modern stream-multiplexed transport.
// The field set is large because the schema mirrors what the server-side
// listener reads — plus a few client-only fields (`uplinkHTTPMethod`,
// `headers`) the panel embeds into share-link `extra` blobs even though the
// server ignores them at runtime. Outbound has additional fields (uplinkChunk
// sizes, noGRPCHeader, scMinPostsIntervalMs, xmux, downloadSettings) which
// belong on the outbound class instead, not modeled here.
// XMUX is the connection-multiplexing layer xHTTP uses to fan out
// parallel requests over a small pool of upstream connections. Fields
// are strings because they accept dash-range values like '16-32'.
export const XHttpXmuxSchema = z.object({
  maxConcurrency: z.union([z.string(), z.number()]).optional(),
  maxConnections: z.union([z.string(), z.number()]).optional(),
  cMaxReuseTimes: z.union([z.string(), z.number()]).optional(),
  hMaxRequestTimes: z.union([z.string(), z.number()]).optional(),
  hMaxReusableSecs: z.union([z.string(), z.number()]).optional(),
  hKeepAlivePeriod: z.union([z.string(), z.number()]).optional(),
});
export type XHttpXmux = z.infer<typeof XHttpXmuxSchema>;

export const XHttpStreamSettingsSchema = z.object({
  path: z.string().default('/'),
  host: z.string().default(''),
  mode: XHttpModeSchema.default('auto'),
  xPaddingBytes: z.string().default('100-1000'),
  xPaddingObfsMode: z.boolean().default(false),
  xPaddingKey: z.string().default(''),
  xPaddingHeader: z.string().default(''),
  xPaddingPlacement: z.string().default(''),
  xPaddingMethod: z.string().default(''),
  sessionPlacement: z.string().default(''),
  sessionKey: z.string().default(''),
  seqPlacement: z.string().default(''),
  seqKey: z.string().default(''),
  uplinkDataPlacement: z.string().default(''),
  uplinkDataKey: z.string().default(''),
  scMaxEachPostBytes: z.string().default('1000000'),
  noSSEHeader: z.boolean().default(false),
  scMaxBufferedPosts: z.number().int().min(0).default(30),
  scStreamUpServerSecs: z.string().default('20-80'),
  serverMaxHeaderBytes: z.number().int().min(0).default(0),
  uplinkHTTPMethod: z.string().default(''),
  headers: WsHeaderMapSchema.default({}),
  // Outbound-only fields. Server (inbound) listener ignores these. The
  // panel embeds them in share-link `extra` blobs so the same xhttp
  // config can roundtrip on both sides.
  scMinPostsIntervalMs: z.string().default('30'),
  uplinkChunkSize: z.number().int().min(0).default(0),
  noGRPCHeader: z.boolean().default(false),
  xmux: XHttpXmuxSchema.optional(),
  // UI-only toggle controlling whether the XMUX sub-form is expanded.
  // Never present on the wire — outbound modal strips it via the
  // form-to-wire adapter.
  enableXmux: z.boolean().default(false),
  // Inbound UI settings for fallback client xmux configurations.
  uiXmuxEnabled: z.boolean().optional(),
  uiXmuxSettings: XHttpXmuxSchema.optional(),
});
export type XHttpStreamSettings = z.infer<typeof XHttpStreamSettingsSchema>;
