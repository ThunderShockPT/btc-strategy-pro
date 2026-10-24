import pg from 'pg';
import Runtime from '../../../backend/edge-runtime.cjs';
import release from '../../../policies/cloud-release-20261021.json' with { type: 'json' };
// Runtime composes private calculations/reviews lazily; production data providers and the release policy remain closed.
const handler = Runtime.create({getEnv: key => Deno.env.get(key),Pool:pg.Pool,policy:release,origins:['https://thundershockpt.github.io','https://btc-strategy-pro-v20-preview.wintrythyme34.chatgpt.site']});
Deno.serve((request,info)=>handler(request,info));
