# DevOps with Kubernetes submissions

## Chapter 2

* [1.1 Log output](https://github.com/kevin1-john1/KTDOPS/tree/1.1/log-output)
* [1.2 Todo app step 1](https://github.com/kevin1-john1/KTDOPS/tree/1.2/todo-app)
* [1.3 Log output declarative deployment](https://github.com/kevin1-john1/KTDOPS/tree/1.3/log-output)
* [1.4 Todo app declarative deployment](https://github.com/kevin1-john1/KTDOPS/tree/1.4/todo-app)
* [1.5 Todo app GET /](https://github.com/kevin1-john1/KTDOPS/tree/1.5/todo-app)
* [1.6 Todo app NodePort](https://github.com/kevin1-john1/KTDOPS/tree/1.6/todo-app)
* [1.7 Log output Ingress](https://github.com/kevin1-john1/KTDOPS/tree/1.7/log-output)
* [1.8 Todo app Ingress](https://github.com/kevin1-john1/KTDOPS/tree/1.8/todo-app)
* [1.9 Ping-pong and Log output shared Ingress](https://github.com/kevin1-john1/KTDOPS/tree/1.9)
* [1.10 Log output split into two containers](https://github.com/kevin1-john1/KTDOPS/tree/1.10/log-output)
* [1.11 Log output and Ping-pong with persistent volume](https://github.com/kevin1-john1/KTDOPS/tree/1.11)
* [1.12 Todo app with cached random image](https://github.com/kevin1-john1/KTDOPS/tree/1.12/todo-app)
* [1.13 Todo app form and hardcoded todos](https://github.com/kevin1-john1/KTDOPS/tree/1.13/todo-app)

## Chapter 3

* [2.1 Log output and Ping-pong connected with HTTP](https://github.com/kevin1-john1/KTDOPS/tree/2.1)
* [2.2 Todo backend service](https://github.com/kevin1-john1/KTDOPS/tree/2.2)
* [2.3 Exercise apps moved to exercises namespace](https://github.com/kevin1-john1/KTDOPS/tree/2.3)
* [2.4 Project apps moved to project namespace](https://github.com/kevin1-john1/KTDOPS/tree/2.4)
* [2.5 Log output ConfigMap](https://github.com/kevin1-john1/KTDOPS/tree/2.5/log-output)
* [2.6 Project configuration with ConfigMaps](https://github.com/kevin1-john1/KTDOPS/tree/2.6)
* [2.7 Ping-pong counter with PostgreSQL StatefulSet](https://github.com/kevin1-john1/KTDOPS/tree/2.7)
* [2.8 Todo backend with PostgreSQL StatefulSet](https://github.com/kevin1-john1/KTDOPS/tree/2.8)
* [2.9 Wikipedia todo CronJob](https://github.com/kevin1-john1/KTDOPS/tree/2.9)
* [2.10 Todo backend request logging](https://github.com/kevin1-john1/KTDOPS/tree/2.10)

## Chapter 4

* [3.1 Ping-pong GKE LoadBalancer](https://github.com/kevin1-john1/KTDOPS/tree/3.1)
* [3.2 Log output and Ping-pong GKE Ingress](https://github.com/kevin1-john1/KTDOPS/tree/3.2)
* [3.3 Log output and Ping-pong Gateway API](https://github.com/kevin1-john1/KTDOPS/tree/3.3)
* [3.4 Gateway API rewritten routing](https://github.com/kevin1-john1/KTDOPS/tree/3.4)
* [3.5 Project with Kustomize on GKE](https://github.com/kevin1-john1/KTDOPS/tree/3.5)
* [3.6 Project GitHub Actions deployment pipeline](https://github.com/kevin1-john1/KTDOPS/tree/3.6)
* [3.7 Branch-specific project environments](https://github.com/kevin1-john1/KTDOPS/tree/3.7)
* [3.8 Delete branch environment workflow](https://github.com/kevin1-john1/KTDOPS/tree/3.8)
* [3.9 DBaaS vs DIY PostgreSQL comparison](https://github.com/kevin1-john1/KTDOPS/tree/3.9)
* [3.10 Todo database backup CronJob](https://github.com/kevin1-john1/KTDOPS/tree/3.10)
* [3.11 Project resource requests and limits](https://github.com/kevin1-john1/KTDOPS/tree/3.11)
* [3.12 GKE todo creation logs](https://github.com/kevin1-john1/KTDOPS/tree/3.12)

## Exercise 3.9: DBaaS vs DIY PostgreSQL

### DBaaS: Google Cloud SQL for PostgreSQL

#### Pros

* Cloud SQL is faster to initialize for production because Google manages the database server, storage, backups, and infrastructure.
* Automated backups and on-demand backups are built in, so the backup setup is easier than building our own backup system.
* Restore operations are easier because backup and restore features are part of the managed service.
* Maintenance work is lower because Google handles many operational tasks such as infrastructure management, patching, availability options, and storage management.
* It is easier to use production-ready features such as high availability, backup retention, point-in-time recovery, monitoring, and read replicas.
* The application deployment becomes simpler because the database lifecycle is separated from Kubernetes workload lifecycle.

#### Cons

* Cloud SQL can cost more for a small course project because the database instance is billed separately from the GKE cluster.
* There can be more vendor lock-in because the database is now a Google Cloud managed service.
* Some low-level PostgreSQL and infrastructure configuration options are not fully controlled by us.
* Secure networking and IAM setup can be more complex, especially when connecting from GKE.
* Local development and production may become less similar because the production database is not just another Kubernetes resource.

### DIY PostgreSQL on GKE using StatefulSet and PersistentVolumeClaim

#### Pros

* DIY PostgreSQL can be cheaper for a small learning project because it runs inside the same GKE cluster.
* The whole setup can be described using Kubernetes manifests, which fits well with Kustomize and GitOps-style deployment.
* It gives more control over the PostgreSQL image, version, configuration, storage, backup script, and runtime behavior.
* It is useful for learning Kubernetes concepts such as StatefulSets, PersistentVolumeClaims, Secrets, CronJobs, and database backups.
* It avoids creating a separate managed database service.

#### Cons

* More operational work is required because we must manage deployment, storage, backups, restore process, monitoring, updates, and failures ourselves.
* Backup setup is manual. For example, we need a CronJob that runs `pg_dump` and uploads the dump to object storage.
* Restore is also manual. We must download the dump and restore it ourselves.
* Reliability is weaker unless we build extra features such as replicas, failover, backup verification, monitoring, and disaster recovery.
* A wrongly configured StatefulSet, PersistentVolumeClaim, or rollout strategy can cause downtime or data problems.
* Scaling and upgrading the database is harder than scaling stateless applications.

### Required work comparison

Cloud SQL requires more initial cloud setup, such as creating the instance, configuring networking, users, IAM, backups, and connection details. However, after setup, it requires less day-to-day maintenance.

DIY PostgreSQL requires less cloud-specific setup at the beginning because it can be deployed with Kubernetes YAML files. However, it requires much more maintenance because we are responsible for the database container, persistent storage, backup CronJob, restore process, monitoring, and upgrades.

### Cost comparison

Cloud SQL has a separate cost for the database instance, storage, backups, and possible high availability features. It is usually more expensive for a small course project, but the extra cost pays for managed operations.

DIY PostgreSQL uses the GKE cluster resources and persistent disks. It can be cheaper for a small project, but the real cost includes the engineering time needed to manage backups, upgrades, reliability, and recovery.

### Backup comparison

Cloud SQL has built-in backup features, including automated backups and restore support. This makes it easier to operate safely.

DIY PostgreSQL needs a custom backup process. In this project, that means creating a Kubernetes CronJob that runs `pg_dump` and uploads the backup to Google Cloud Storage. This works, but we must also verify backups and know how to restore them.

### Conclusion

For a real production application, I would prefer Cloud SQL because it reduces maintenance work and provides managed backups, restore features, and reliability options. For this course project, DIY PostgreSQL on GKE is acceptable because it is cheaper, easier to keep inside Kubernetes manifests, and useful for learning StatefulSets, PersistentVolumeClaims, Secrets, CronJobs, and backups.


## Exercise 4.3: Prometheus query

Query used to show the number of Pods created by StatefulSets in the monitoring namespace:

```promql
count(kube_pod_info{namespace="monitoring",created_by_kind="StatefulSet"})