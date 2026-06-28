## Exercise 5.2: Istio service mesh

Istio ambient mode was installed into the k3d cluster. The default namespace was added to the mesh using `istio.io/dataplane-mode=ambient`, and a waypoint proxy was created for Layer 7 routing. Prometheus and Kiali were installed to visualize traffic.