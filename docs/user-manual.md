# The user manual

`/dashboard/user-manual`: what each part of Letshego is for and how to do the work, narrowed to the reader's
role. Laid out as current documentation sites are (Stripe's, Mintlify's; three columns as Kong's and Block's docs
layouts describe): one surface, a plain side menu (chapters, their modules on a rule), a reading column, "On this
page" sticky on the right, callouts with a coloured edge; the start page draws the funnel in four steps, marks the
reader's role and lays the modules out as cards across the whole width (the user, 30 Oct 2026: the indigo banner
and the boxed menu "look ugly"). **Every module that ships updates its chapter in the same change** (the manual is part of done).

## Where it lives

- [manual.ts](../app/dashboard/user-manual/manual.ts): the content, as data (SDS's pattern). Chapters hold
  modules; a module holds topics. A module names the `route` it is about and the `permission` its actions need,
  never the roles: the page works out who reaches it from the menu (lib/pageAccess) and `can()`, so moving a
  permission between roles moves the manual with it.
- [UserManual.tsx](../app/dashboard/user-manual/UserManual.tsx): the page.

## The layout (25 Oct 2026)

Laid out as documentation sites are, replacing the earlier stack of accordions (a closed panel hides the
answer, and a long page of panels has no sense of place):

- **A side menu** of chapters and their modules, with the search on top and **Start here** first; a dot marks a
  module outside the reader's role when **Show every module** is on.
- **One module per page**, in the URL (`?m=pipeline`), so another page can link to the right part of the
  manual. Every topic is a headed section with an anchor (`#add-a-prospect`), its steps as a numbered line,
  its notes in a **Good to know** box, its warning in amber. **Previous / Next** at the foot.
- **On this page** on wide screens (1280 px and up), marking the topic being read as the page scrolls.
- **Search** lists every matching topic with its place (Sales › Client pipeline) and the words around the match,
  marked; a result opens the module at that topic.
- **Start here**: what the system is for in three sentences, the six roles (the reader's marked), and each
  chapter's modules to jump to.

Sources: [GitBook, designing documentation sites (2026)](https://www.gitbook.com/blog/guide-to-designing-documentation-sites)
(organise by what readers do), [ReadMe on docs design](https://readme.com/resources/7-ways-to-improve-the-design-of-your-api-documentation)
(a grouped sidebar, never a flat list), [I'd Rather Be Writing on doc navigation](https://idratherbewriting.com/files/doc-navigation-wtd/design-principles-for-doc-navigation/),
[Pelican's documentation page template](https://pelican.ots.la.gov/page-templates/documentation-page/) (links to
the section headers on the page).

## Writing a topic

- `title` is the task or the thing ("Add a prospect", "Using the map"); `body` one paragraph on what it is for.
- `steps` when it is a task, in the order the screen asks; name buttons exactly as the screen prints them.
- `notes` for facts that are true and easy to get wrong; `warning` for one mistake worth naming outright.
- Plain words, no em dashes, the reader's words in `keywords` when the text never prints them ("satellite",
  "print").

`e2e/admin/user-manual.spec.ts` opens a module from the menu and finds a topic by search.
