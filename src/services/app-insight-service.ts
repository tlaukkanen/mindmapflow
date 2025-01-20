"use client";

import { useEffect } from "react";
import { ApplicationInsights } from "@microsoft/applicationinsights-web";
import { ReactPlugin } from "@microsoft/applicationinsights-react-js";
import { createBrowserHistory } from "history";

import { logger } from "./logger";
const reactPlugin = new ReactPlugin();
let appInsights: ApplicationInsights | undefined;
const initializeAppInsights = () => {
  if (typeof window !== "undefined") {
    const connectionString =
      process.env.NEXT_PUBLIC_APPINSIGHTS_CONNECTION_STRING;

    if (!connectionString) {
      logger.warn("Application Insights connection string is not configured");

      return;
    }

    const customHistory = createBrowserHistory();

    appInsights = new ApplicationInsights({
      config: {
        connectionString: connectionString,
        extensions: [reactPlugin],
        extensionConfig: {
          [reactPlugin.identifier]: {
            history: customHistory,
          },
        },
        enableAutoRouteTracking: true,
        disableTelemetry: false,
      },
    });

    appInsights.loadAppInsights();
    appInsights.trackTrace({
      message: `Initialized with version: ${process.env.NEXT_PUBLIC_VERSION_TAG}`,
    });
  }
};
const logMessageToAppInsights = (message: string) => {
  if (appInsights) {
    appInsights.trackTrace({ message });
  }
};
const AppInsightService: React.FC = () => {
  useEffect(() => {
    if (typeof window !== "undefined" && !appInsights) {
      initializeAppInsights();
    }
  }, []);
  useEffect(() => {
    logMessageToAppInsights("AppInsightService component mounted");
  }, []);

  return null;
};

export { reactPlugin, AppInsightService };
