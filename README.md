# dns-proxy-drop-a

A DNS proxy which blocks lookups for IN A records. I'm using it on a Mythic
Beasts hosted Raspberry Pi to force nodejs to use IPv6. Without this it
prefers IPv4 addresses - which don't generally route anywhere useful in this
environment.

Mythic Beasts excellent 
[hosted Raspberry Pis](https://www.mythic-beasts.com/order/rpi) are
IPv6 to the internet. They have an IPv4 gateway configured but it doesn't route
to the internet. This isn't much of a problem in practice; there are various
proxies and gateways so that, for example, the Pi can access IPv4 sites via
DNS64 and a NAT64 gateway.

This works well for most software but node.js is confused by the presence of an
IPv4 route and tends to use that in preference to the IPv6 gateway which routes
correctly to the internet. That means that npm doesn't work and most node code
that attempts to connect to a remote service will also fail.

By stripping all ```IN A``` requests ```dns-proxy-drop-a``` forces node.js to use
IPv6 which, thanks to the DNS64, NAT64 setup works even for domains that are
IPv4 only.

