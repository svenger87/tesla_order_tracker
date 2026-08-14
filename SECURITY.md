# Security Policy

## Reporting a vulnerability

Please report security issues privately, **not** as a public GitHub issue.

Use GitHub's private vulnerability reporting on this repository:
**Security → Report a vulnerability**
(<https://github.com/svenger87/tesla_order_tracker/security/advisories/new>)

That keeps the report visible only to the maintainer until a fix is out. Expect
a first reply within a few days — this is a spare-time project, so please allow
some patience.

Helpful things to include: what you did, what happened, and what you expected.
A concrete request or a short reproduction script says more than a scanner
report.

## Scope

The deployed sites `tff-order-stats.de` and `staging.tff-order-stats.de`, and
this repository.

Please do **not**, while testing:

- run load or denial-of-service tests against the live sites,
- modify or delete other people's orders,
- create bulk entries.

Staging is the better place to try things out.

## What this project deliberately does not protect

Some things look like vulnerabilities but are product decisions. Reports about
them are still welcome — as ideas, not as security issues:

- **No accounts.** Entries are created without registration and protected by a
  self-chosen password per order. There is no email address and therefore no
  account recovery beyond the one-time code an admin issues.
- **All order data is public.** Name, configuration, dates and VIN are visible
  to everyone through the website and the API. That is the point of the
  project.
- **Imported legacy entries have no owner.** Orders taken over from the
  original Google Sheet carry no password until someone claims them. Since
  every field is public, no piece of data can prove ownership of one of them.
- **Five fields of TOST-managed orders are editable by anyone.** TOST does not
  track order date, papers date, production date, type approval and type
  variant; the community fills them in here. Those orders belong to users of a
  different system, so there are no credentials to check against.

## Supported versions

Only the currently deployed version on `master` receives fixes.
