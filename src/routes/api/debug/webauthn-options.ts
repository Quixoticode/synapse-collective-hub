import { createAPIFileRoute } from "@tanstack/react-start/api";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

export const APIRoute = createAPIFileRoute("/api/debug/webauthn-options")({
  GET: async ({ request }) => {
    const url = new URL(request.url);
    const slid = url.searchParams.get("slid");
    const origin = url.searchParams.get("origin") || "https://central.xsyna.de";
    
    const urlObj = new URL(origin);
    const rpID = urlObj.hostname;
    
    // Build allowCredentials from query or none
    let allow: { id: string; transports?: string[] }[] | undefined = undefined;
    const credId = url.searchParams.get("cred");
    if (credId) {
      allow = [{ id: credId }];
    }
    
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: allow,
      userVerification: "preferred",
    });
    
    return new Response(JSON.stringify({
      rpID,
      origin: urlObj.origin,
      options,
      challengeLength: Buffer.from(options.challenge, "base64url").length,
      hasAllowCredentials: !!allow,
      env: {
        hasXsynaRpid: !!(process.env as any).XSYNA_RPID,
        hasUrlHostname: !!urlObj.hostname,
      }
    }, null, 2), {
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
    });
  },
});
