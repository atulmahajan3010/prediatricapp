# Doctor Clinic App: Commercial and Scaling Plan

## 1. Assumptions

This estimate is for the current product: React frontend, Express API, PostgreSQL database, doctor login, clinic branding, patients, visits, prescriptions, medicines, templates, follow-ups, bills, reports, and local Windows deployment.

Prices below are planning ranges in Indian rupees (INR), excluding GST and hardware. The final quote should depend on the clinic's number of doctors, data migration needs, support period, and whether a printer or local network is included.

## 2. Recommended Offline Price

### Suggested package for one clinic and one doctor

**Recommended selling price: INR 45,000 one time**

Include:

- Installation on one Windows computer
- Local PostgreSQL database setup
- Doctor and clinic profile setup
- Clinic logo and prescription letterhead configuration
- Existing patient data import from one clean Excel/CSV file
- One printer setup or print verification
- One staff training session of up to two hours
- 30 days of bug-fix support
- Backup and restore instructions

### Practical price range

| Package | Price | Suitable for |
|---|---:|---|
| Basic install | INR 25,000-35,000 | New clinic, no data migration, one computer |
| Standard recommended | INR 40,000-60,000 | One doctor, migration, branding, training, backup setup |
| Premium offline | INR 75,000-1,25,000 | Multiple computers on LAN, migration cleanup, custom reports, extended support |

### Charge separately

| Item | Suggested price |
|---|---:|
| Additional doctor account | INR 8,000-15,000 one time |
| Additional computer or LAN setup | INR 5,000-12,000 |
| Data migration and cleanup | INR 5,000-25,000 |
| Custom report or prescription layout | INR 5,000-20,000 each |
| On-site training day | INR 5,000-12,000 |
| Annual support after included period | INR 12,000-24,000 per clinic |
| Emergency on-site visit | INR 2,000-5,000 plus travel |

Do not sell the source code or unlimited customization inside the standard price. Keep the source code, product roadmap, and reusable features under your ownership. Sell a clinic license and support commitment instead.

### Your approximate delivery cost

For one standard offline installation, budget roughly:

- Installation, configuration, and testing: 4-8 hours
- Data cleanup and import: 4-16 hours
- Training and handover: 2-4 hours
- Support reserve: 4-8 hours

At an internal engineering rate of INR 800-1,500 per hour, the delivery cost is approximately INR 12,000-54,000 before travel and hardware. A INR 40,000-60,000 standard price leaves room for support and product maintenance.

## 3. Offline Product Rules

Before selling widely, add these operational safeguards:

1. Create a tested one-click backup and restore process for PostgreSQL.
2. Add a visible database backup status and last-backup timestamp.
3. Add a safe update process that preserves `.env`, uploads, and database data.
4. Add an installation checklist and a short user guide.
5. Add a clinic license record containing clinic name, doctor count, installation date, and support expiry.
6. Never store the database password in screenshots, support tickets, or shared documents.
7. Add audit logging before handling multiple staff users or sensitive records.
8. Make the application work without internet after installation. Remote support should be optional and consent-based.

## 4. Online SaaS Pricing Recommendation

Do not begin with a free unlimited plan. Medical support, backups, security, and support create a real operating cost.

| Online plan | Suggested price | Included |
|---|---:|---|
| Starter | INR 999/month or INR 9,999/year | One doctor, one clinic, core patient and prescription workflows |
| Professional | INR 1,999/month or INR 19,999/year | Reports, billing, templates, follow-ups, backups, priority support |
| Clinic | INR 3,999/month or INR 39,999/year | Up to five doctors, staff accounts, permissions, shared clinic data |
| Enterprise | Custom, starting around INR 8,000/month | Multiple branches, SSO, integrations, SLA, migration, custom reporting |

Offer a 14-day trial or demo account with sample data. Avoid using real patient data during trials.

Possible one-time online onboarding fee: INR 5,000-25,000 depending on migration and training.

## 5. Online Architecture Target

### Current offline architecture

```text
Browser -> Express API -> PostgreSQL on clinic computer
```

### Recommended first online architecture

```text
Browser -> HTTPS reverse proxy -> Express API -> Managed PostgreSQL
                                      |
                                      +-> Object storage for logos and exports
                                      +-> Email provider for notifications
                                      +-> Scheduled backup worker
```

The current doctor-scoped schema is a useful starting point. For SaaS, introduce a first-class `clinics` table and make every business record belong to a clinic. Doctors and staff should belong to a clinic through membership records rather than relying only on `doctor_id`.

## 6. Step-by-Step Online Roadmap

### Phase 0: Product hardening before hosting

Estimated effort: 1-2 weeks.

- Add automated tests for authentication and all CRUD routes.
- Add database migrations instead of only re-running `schema.sql`.
- Add request validation and consistent error responses.
- Add audit fields and a basic audit log for clinical and billing changes.
- Move uploaded logo data out of database text fields into object storage later.
- Add data export and account deletion procedures.
- Review the app against applicable Indian privacy, medical record, tax, and hosting obligations with a qualified advisor.

### Phase 1: Single-tenant online pilot

Estimated effort: 2-4 weeks.

- Deploy one API service and one managed PostgreSQL database.
- Add HTTPS, environment secrets, CORS restrictions, and rate limiting.
- Configure daily encrypted database backups and test restoration.
- Add health checks, structured logs, and basic uptime monitoring.
- Onboard 2-5 friendly clinics.
- Keep deployment simple: one region, one database, one API service.

Expected monthly infrastructure budget: approximately INR 4,000-15,000 for a small pilot, excluding engineering and support. Provider choice and traffic can move this range substantially.

### Phase 2: Multi-tenant SaaS foundation

Estimated effort: 4-8 weeks.

- Add `clinics`, `clinic_memberships`, and role permissions.
- Enforce tenant filtering in every API query.
- Add clinic subscription status and feature entitlements.
- Add invitation flow for doctors and staff.
- Add password reset, email verification, session revocation, and refresh-token rotation.
- Add billing integration such as Razorpay or Stripe after confirming business requirements.
- Add tenant-aware exports and backups.
- Add automated isolation tests proving Clinic A cannot read Clinic B data.

Expected engineering budget: INR 2,00,000-5,00,000 depending on test coverage, billing, permissions, and migration complexity.

### Phase 3: Operational readiness

Estimated effort: 3-6 weeks.

- Add error tracking and performance monitoring.
- Add background jobs for reminders, report generation, and email delivery.
- Add immutable audit events for prescriptions, patient records, and bills.
- Add support tools that never expose passwords or raw credentials.
- Add disaster recovery drills and a documented incident process.
- Add privacy policy, terms, consent wording, retention rules, and a data-processing agreement where required.
- Perform security review and penetration testing before a large launch.

Expected security and operations budget: INR 1,00,000-3,00,000 initially, plus recurring provider costs.

### Phase 4: Scale and integrations

Estimated effort: ongoing.

- Add read replicas only when measured database load requires them.
- Add a queue and worker service for heavy jobs.
- Add regional backups and a tested recovery time objective.
- Add SMS/WhatsApp/email reminders through compliant providers.
- Add accounting, lab, pharmacy, or payment integrations only after stable API contracts exist.
- Add mobile or desktop clients only after the web workflows and tenancy model are stable.

Do not start with Kubernetes, microservices, or multiple regions. A modular Express service with managed PostgreSQL is simpler to operate until actual usage proves otherwise.

## 7. Recurring Online Cost Model

Plan for these categories rather than one provider-specific number:

| Category | Pilot estimate/month | Growth estimate/month |
|---|---:|---:|
| API hosting | INR 1,000-5,000 | INR 5,000-25,000 |
| Managed PostgreSQL | INR 1,500-8,000 | INR 8,000-40,000 |
| Backups and object storage | INR 500-3,000 | INR 3,000-15,000 |
| Email/SMS notifications | INR 500-5,000 | Usage based |
| Monitoring and error tracking | INR 0-5,000 | INR 5,000-25,000 |
| Domain and TLS | INR 1,000-3,000/year | INR 1,000-3,000/year |
| Support and maintenance | Separate staff budget | Separate staff budget |

These are planning ranges, not vendor quotes. Get current prices from the selected providers before committing to a plan.

## 8. AI Add-on Position

Keep the local AI assistant separate from the core clinical record system at first. For offline clinics, bundle it only as an optional module after model performance and hardware requirements are tested.

Suggested pricing:

- Local AI installation: INR 15,000-40,000 one time, depending on hardware and model setup.
- Online AI assistant: usage-based or INR 500-2,000 per doctor per month, after provider and privacy costs are known.

AI may summarize notes or draft instructions, but it must not silently diagnose, prescribe, or update records. Require doctor review before saving any AI-generated text.

## 9. Recommended Immediate Business Plan

1. Sell the current offline product at INR 40,000-60,000 for a standard one-doctor clinic.
2. Include 30 days of support and charge INR 12,000-24,000 annually afterward.
3. Use the first 3-5 clinics as paid pilot customers, not free development projects.
4. Record recurring requests and convert only repeated requests into product features.
5. Harden backups, migrations, permissions, and audit logs before online multi-tenancy.
6. Launch online first with 2-5 clinics on a simple managed stack.
7. Start SaaS pricing around INR 999-1,999 per doctor per month and increase based on support and infrastructure usage.

## 10. Quote Boundary

Every clinic quote should explicitly state:

- Number of doctors and computers included
- Whether data migration is included and how many rows
- Whether printer, LAN, or hardware support is included
- Support hours and response time
- Backup responsibility and frequency
- What happens if the clinic stops support payments
- Ownership of source code and custom work
- Whether online hosting, SMS, email, and AI are included or billed separately
