import {
  assertMainnetAcceptanceAuthorized,
  MainnetAcceptanceAuthorizationConfigurationError,
  MainnetAcceptanceAuthorizationError,
} from "./mainnet-acceptance-authorization";

export type MainnetAcceptanceAuthorizer = (request: Request) => Promise<unknown>;

export async function controlledMainnetAuthorizationFailure(
  request: Request,
  authorize: MainnetAcceptanceAuthorizer = assertMainnetAcceptanceAuthorized,
): Promise<Response | null> {
  try {
    await authorize(request);
    return null;
  } catch (error) {
    if (error instanceof MainnetAcceptanceAuthorizationError) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
            "WWW-Authenticate": 'Bearer realm="mainnet-xrp-acceptance"',
          },
        },
      );
    }
    if (error instanceof MainnetAcceptanceAuthorizationConfigurationError) {
      return Response.json(
        {
          error: {
            code: error.code,
            message: error.message,
          },
        },
        {
          status: 503,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    throw error;
  }
}
