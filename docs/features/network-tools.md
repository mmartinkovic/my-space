# Feature: Networking & security tools

All logic in `packages/core-nettools` (pure TS, platform-agnostic), UI in `apps/web/src/features/tools`. Client-side except "My IP & headers".

## Tools
| Tool | Behaviour |
|---|---|
| **IPv4 subnet calculator** | Input `a.b.c.d/nn` or address + mask (dotted or prefix). Output: network, broadcast, first/last host, host count (`/31` = 2 point-to-point, `/32` = 1), wildcard mask, mask in dotted/binary, class & type (private RFC 1918, loopback, link-local, CGNAT 100.64/10, multicast, documentation). Binary view highlighting network/host bits |
| **VLSM planner (IPv4)** | Input base network + list of `{name, hostsNeeded}`; allocate largest-first, aligned; output table (name, needed, allocated size, network/prefix, range, broadcast, waste); error when it doesn't fit |
| **IPv6 calculator** | Input `addr/prefix` (any compressed form); output full and compressed (RFC 5952) forms, network prefix, first/last address, number of /64 subnets, type (global unicast, ULA fc00::/7, link-local fe80::/10, multicast, loopback, documentation 2001:db8::/32). `bigint` arithmetic |
| **DNS lookup** | Name + record type (A, AAAA, CNAME, MX, TXT, NS, SOA, CAA, PTR (auto-reverse for IPs), SRV); queries Cloudflare DoH JSON from the browser, fallback Google; shows status (NOERROR/NXDOMAIN…), answers with TTL, AD (DNSSEC) flag; compare-both-resolvers toggle |
| **My IP & request headers** | `GET /api/tools/whoami` (authenticated): client IP as seen by the server (from trusted proxy), IP version, request headers minus `cookie`, `authorization` and internal headers |
| **Encoders** | Base64 (standard + URL-safe), hex, URL encode/decode, UTF-8 aware; live two-way conversion |
| **Hashes** | SHA-1, SHA-256, SHA-384, SHA-512 via WebCrypto `crypto.subtle.digest` for text or file (hex + base64). MD5 not offered (not in WebCrypto; obsolete) |
| **Ports & protocols cheat sheet** | Static searchable table (port, protocol TCP/UDP, service, note) for ~60 common ports + OSI/TCP-IP layer reference; data in `core-nettools/consts` |

## Rules
- Invalid input → inline validation message (localised), never throws to UI.
- Calculations deterministic and pure; UI state in URL params (shareable/bookmarkable).
- CSP `connect-src` includes the two DoH hosts only.

## Acceptance criteria
- [ ] Property/table tests for IPv4: `/0`, `/8`, `/24`, `/30`, `/31`, `/32`, invalid octets, leading zeros policy (reject).
- [ ] VLSM tests with known textbook examples (incl. exact-fit and overflow).
- [ ] IPv6 tests: compression rules (longest zero run, lower-case, no single-group `::`), `::`, `::1`, IPv4-mapped.
- [ ] DoH response zod schema tested against recorded responses; fallback on simulated failure.
