const k8s = require("@kubernetes/client-node");

const GROUP = "stable.dwk";
const VERSION = "v1";
const PLURAL = "dummysites";

const kc = new k8s.KubeConfig();

if (process.env.KUBERNETES_SERVICE_HOST) {
  kc.loadFromCluster();
} else {
  kc.loadFromDefault();
}

const objectApi = k8s.KubernetesObjectApi.makeApiClient(kc);
const watch = new k8s.Watch(kc);

const log = (event, data = {}) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      service: "dummysite-controller",
      event,
      ...data
    })
  );
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const resourceName = (dummySiteName) => `dummysite-${dummySiteName}`;

const getOwnerReference = (dummySite) => ({
  apiVersion: `${GROUP}/${VERSION}`,
  kind: "DummySite",
  name: dummySite.metadata.name,
  uid: dummySite.metadata.uid,
  controller: true,
  blockOwnerDeletion: true
});

const commonLabels = (dummySite) => ({
  app: "dummysite",
  "dummysite/name": dummySite.metadata.name
});

const createOrPatch = async (object) => {
  try {
    await objectApi.read(object);
    await objectApi.patch(object);

    log("resource_patched", {
      kind: object.kind,
      name: object.metadata.name,
      namespace: object.metadata.namespace
    });
  } catch (error) {
    const statusCode = error?.body?.code || error?.statusCode;

    if (statusCode === 404) {
      await objectApi.create(object);

      log("resource_created", {
        kind: object.kind,
        name: object.metadata.name,
        namespace: object.metadata.namespace
      });

      return;
    }

    throw error;
  }
};

const deleteIfExists = async (object) => {
  try {
    await objectApi.delete(object);

    log("resource_deleted", {
      kind: object.kind,
      name: object.metadata.name,
      namespace: object.metadata.namespace
    });
  } catch (error) {
    const statusCode = error?.body?.code || error?.statusCode;

    if (statusCode === 404) {
      return;
    }

    throw error;
  }
};

const buildDeployment = (dummySite) => {
  const name = resourceName(dummySite.metadata.name);
  const namespace = dummySite.metadata.namespace || "default";
  const websiteUrl = dummySite.spec.website_url;

  return {
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name,
      namespace,
      labels: commonLabels(dummySite),
      ownerReferences: [getOwnerReference(dummySite)]
    },
    spec: {
      replicas: 1,
      selector: {
        matchLabels: commonLabels(dummySite)
      },
      template: {
        metadata: {
          labels: commonLabels(dummySite),
          annotations: {
            "dummysite/website-url": websiteUrl,
            "dummysite/resource-version": dummySite.metadata.resourceVersion || ""
          }
        },
        spec: {
          volumes: [
            {
              name: "site-html",
              emptyDir: {}
            }
          ],
          initContainers: [
            {
              name: "fetch-html",
              image: "curlimages/curl:8.12.1",
              command: ["sh", "-c"],
              args: [
                [
                  "set -e",
                  "echo \"Fetching website: $WEBSITE_URL\"",
                  "curl -L --fail --max-time 60 \"$WEBSITE_URL\" -o /work/index.html",
                  "echo \"\" >> /work/index.html",
                  "echo \"<!-- Copied by DummySite controller from $WEBSITE_URL -->\" >> /work/index.html",
                  "echo \"Website copied successfully\""
                ].join("\n")
              ],
              env: [
                {
                  name: "WEBSITE_URL",
                  value: websiteUrl
                }
              ],
              volumeMounts: [
                {
                  name: "site-html",
                  mountPath: "/work"
                }
              ]
            }
          ],
          containers: [
            {
              name: "nginx",
              image: "nginx:1.31-alpine",
              ports: [
                {
                  name: "http",
                  containerPort: 80
                }
              ],
              volumeMounts: [
                {
                  name: "site-html",
                  mountPath: "/usr/share/nginx/html"
                }
              ]
            }
          ]
        }
      }
    }
  };
};

const buildService = (dummySite) => {
  const name = resourceName(dummySite.metadata.name);
  const namespace = dummySite.metadata.namespace || "default";

  return {
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name,
      namespace,
      labels: commonLabels(dummySite),
      ownerReferences: [getOwnerReference(dummySite)]
    },
    spec: {
      type: "ClusterIP",
      selector: commonLabels(dummySite),
      ports: [
        {
          name: "http",
          protocol: "TCP",
          port: 80,
          targetPort: 80
        }
      ]
    }
  };
};

const buildIngress = (dummySite) => {
  const name = resourceName(dummySite.metadata.name);
  const namespace = dummySite.metadata.namespace || "default";

  return {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name,
      namespace,
      labels: commonLabels(dummySite),
      ownerReferences: [getOwnerReference(dummySite)]
    },
    spec: {
      rules: [
        {
          http: {
            paths: [
              {
                path: "/",
                pathType: "Prefix",
                backend: {
                  service: {
                    name,
                    port: {
                      number: 80
                    }
                  }
                }
              }
            ]
          }
        }
      ]
    }
  };
};

const validateDummySite = (dummySite) => {
  const websiteUrl = dummySite?.spec?.website_url;

  if (!websiteUrl || typeof websiteUrl !== "string") {
    throw new Error("spec.website_url is required");
  }

  const parsedUrl = new URL(websiteUrl);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("spec.website_url must start with http:// or https://");
  }
};

const reconcileDummySite = async (dummySite) => {
  validateDummySite(dummySite);

  const name = dummySite.metadata.name;
  const namespace = dummySite.metadata.namespace || "default";

  log("reconcile_started", {
    name,
    namespace,
    websiteUrl: dummySite.spec.website_url
  });

  await createOrPatch(buildDeployment(dummySite));
  await createOrPatch(buildService(dummySite));
  await createOrPatch(buildIngress(dummySite));

  log("reconcile_finished", {
    name,
    namespace
  });
};

const cleanupDummySite = async (dummySite) => {
  const name = resourceName(dummySite.metadata.name);
  const namespace = dummySite.metadata.namespace || "default";

  log("cleanup_started", {
    name,
    namespace
  });

  await deleteIfExists({
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: {
      name,
      namespace
    }
  });

  await deleteIfExists({
    apiVersion: "v1",
    kind: "Service",
    metadata: {
      name,
      namespace
    }
  });

  await deleteIfExists({
    apiVersion: "apps/v1",
    kind: "Deployment",
    metadata: {
      name,
      namespace
    }
  });

  log("cleanup_finished", {
    name,
    namespace
  });
};

const startWatch = async () => {
  const path = `/apis/${GROUP}/${VERSION}/${PLURAL}`;

  log("watch_started", {
    path
  });

  await watch.watch(
    path,
    {},
    async (eventType, object) => {
      try {
        if (eventType === "ADDED" || eventType === "MODIFIED") {
          await reconcileDummySite(object);
          return;
        }

        if (eventType === "DELETED") {
          await cleanupDummySite(object);
        }
      } catch (error) {
        log("reconcile_failed", {
          eventType,
          name: object?.metadata?.name,
          namespace: object?.metadata?.namespace,
          error: error.message
        });
      }
    },
    async (error) => {
      if (error) {
        log("watch_error", {
          error: error.message
        });
      }

      log("watch_stopped_restarting");
      await sleep(3000);
      startWatch();
    }
  );
};

startWatch().catch((error) => {
  log("controller_failed", {
    error: error.message
  });

  process.exit(1);
});