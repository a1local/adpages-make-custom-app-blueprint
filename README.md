# AdPages Make Custom App Blueprint

This is a local-first scaffold for a future Make.com custom app and public integration guide. It describes four useful AdPages utility modules without shipping a hosted API, OAuth connection, or external service dependency yet.

The current package is a blueprint/spec plus a local CLI that proves the module contracts with sample data.

## Modules

| Module | Type | Purpose |
| --- | --- | --- |
| Generate UTM URL | Action | Build campaign URLs with normalized `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, and `utm_content` fields. |
| Validate Google Ads Copy | Action | Check responsive search ad headlines and descriptions against character/count limits before handoff. |
| Generate LocalBusiness Schema | Action | Create a JSON-LD LocalBusiness payload from landing-page and service-area data. |
| Create Landing-Page QA Checklist | Action | Produce a practical QA checklist for offer, tracking, schema, accessibility, and launch review. |

## Local Use

```bash
npm --prefix integrations/make/adpages-custom-app run check
npm --prefix integrations/make/adpages-custom-app run smoke
npm --prefix integrations/make/adpages-custom-app run generate:sample
```

The sample generator writes a preview bundle under `.tmp/make-blueprint/` when run locally. That output is only an implementation aid and should not be treated as a reviewed Make app export.

## Import And Use Flow

1. Review `config/app-metadata.json` for the app position, module list, and current publishing blockers.
2. Review each file under `modules/` as the proposed Make action-module contract.
3. Run the local smoke test with `examples/sample-scenario.json`.
4. Use the generated sample output to build a real Make custom app once a hosted execution strategy is selected.

## Publishing Position

This can be published first as a GitHub integration guide, template repository, and community blueprint. The backlink angle is legitimate: Make users get a concrete scenario design for landing-page QA and campaign handoff, while AdPages gets an integration surface that can later become a hosted app.

This scaffold does not include a hosted API, does not make network calls, does not require OAuth, and does not include Make app review approval.

## Publish Blockers

- Build or deliberately avoid a hosted API for module execution.
- Finalize the auth design, including whether the app needs no connection, API-key auth, or OAuth.
- Submit and pass Make app review once implementation details are production-ready.
- Test a real scenario in Make with the final bundle shape and module field mapping.
- Add final support/privacy URLs, repository URL, screenshots, app icon, changelog, and owner metadata.

## Reference

The module shape follows Make's custom app concept of scenario modules, especially action modules: https://developers.make.com/custom-apps-documentation/app-structure/modules

## Publisher

Built by [AdPages from A1 Local](https://a1local.com.au/extensions/) as a free, dependency-light resource for local-service marketers, web designers, and small business site owners.

