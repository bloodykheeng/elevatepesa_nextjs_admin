
/**
 * The user manual, as data: one flat string per topic for the search box, and each module filtered by
 * the menu's own access rule for its `route` (lib/pageAccess). A module without a route is for everybody.
 * Update the chapter with every change to its page.
 */

export type ManualTopic = {
  title: string;
  /** What it is for, in a paragraph. */
  body: string;
  /** Ordered actions, when the topic is a task. */
  steps?: string[];
  /** Facts that are true and easy to get wrong. */
  notes?: string[];
  /** One mistake worth naming outright. */
  warning?: string;
};

export type ManualModule = {
  id: string;
  title: string;
  summary: string;
  iconName: string;
  /** Words a reader may search that the module's own text never prints. */
  keywords?: string[];
  route?: string;

  topics: ManualTopic[];
};

export type ManualChapter = {
  id: string;
  title: string;
  summary: string;
  modules: ManualModule[];
};

/** What each role is for. One role per person. */
export const ROLE_BRIEFS: { role: string; does: string }[] = [
  { role: "Admin", does: "Everything: orders, payments, the catalogue, the app's content, accounts, roles and messages to customers." },
  { role: "Editor", does: "Day-to-day work: orders, packages, payments, the catalogue and the app's content. Not accounts, roles or messages." },
  { role: "Customer", does: "Shops in the Elevate Pesa mobile app. Customers cannot open this dashboard." },
];

export const MANUAL: ManualChapter[] = [
  {
    id: "start",
    title: "Getting started",
    summary: "Signing in, finding your way around, and getting back in when you forget your password.",
    modules: [
      {
        id: "sign-in",
        title: "Signing in",
        summary: "Your staff email and password.",
        iconName: "dashboard",
        keywords: ["login", "log in", "password", "remember", "logout", "sign out"],
        topics: [
          {
            title: "Sign in",
            body: "Use the email and password of your staff account. Customers' accounts cannot sign in here; they use the mobile app.",
            steps: ["Open adb.elevatepesa.com.", "Type your email and password.", "Tick Keep me signed in for 30 days on your own computer only.", "Press Sign in."],
            notes: ["Without the tick you stay signed in for 12 hours.", "After 5 wrong tries the form waits 10 minutes before it lets you try again."],
          },
          {
            title: "Forgot your password",
            body: "Press Forgot password? on the sign-in page and type your staff email. We send a link that works once, for 60 minutes. Open it and choose a new password.",
            notes: ["The page says the same thing whether or not the email belongs to a staff account, so nobody can use it to find accounts.", "Changing your password signs you out everywhere else."],
          },
          {
            title: "Sign out",
            body: "Open your name at the top right and choose Sign out. Do it on any computer that is not yours.",
          },
        ],
      },
      {
        id: "around",
        title: "Finding your way around",
        summary: "The menu, the bell, light and dark, and how lists remember where you were.",
        iconName: "layers",
        keywords: ["menu", "sidebar", "dark mode", "theme", "bell", "notifications", "back"],
        topics: [
          {
            title: "The menu and the bell",
            body: "The menu on the left holds every page your role can open. The bell at the top right counts new alerts: new orders, package bookings, sign-ups, and messages you sent once they finish. Click one to open it.",
          },
          {
            title: "Lists remember where you were",
            body: "Every list keeps its page, search, filters and sort in the address. Open a record, press Back, and you are on the same page with the same filters, at the same scroll place. You can also copy the address to share exactly what you see.",
          },
          {
            title: "Light and dark",
            body: "The sun or moon at the top switches between light and dark. Your choice is remembered on this computer.",
          },
        ],
      },
    ],
  },
  {
    id: "sales",
    title: "Sales",
    summary: "Orders, packages and the money received for them.",
    modules: [
      {
        id: "dashboard",
        title: "Dashboard",
        summary: "The figures for a period: orders, what was charged and paid, balances, customers.",
        iconName: "dashboard",
        route: "/dashboard",
        keywords: ["overview", "figures", "statistics", "charts", "period"],
        topics: [
          {
            title: "Reading the dashboard",
            body: "It opens on All time. Pick Today, Last 30 days, This month, This year, or Pick days for any range. Each card's small arrow (shown when you point at the card) opens the list behind the figure, with the same period.",
            notes: ["Cancelled orders are left out of values, paid and balances, but counted in Orders.", "Days are Kampala days."],
          },
        ],
      },
      {
        id: "orders",
        title: "Orders",
        summary: "What customers ordered in the app: follow up delivery and record payments.",
        iconName: "cart",
        route: "/dashboard/orders",
        keywords: ["order", "bnpl", "buy now pay later", "cod", "delivery", "balance", "payment"],
        topics: [
          {
            title: "Find an order",
            body: "Search by order number, customer name, phone or address. Filters narrow by status, payment, delivery, payment mode, balance and dates; each filter shows as a chip you can clear.",
          },
          {
            title: "Change status or delivery",
            body: "Open an order with the eye, then Edit. When you change the delivery status the customer gets a message on their phone.",
          },
          {
            title: "Record a payment",
            body: "Open the order and press Record payment. Enter the amount, how it was paid and the transaction number. The balance updates at once, and the customer gets a message.",
            notes: ["You cannot record more than the balance due.", "When the balance reaches zero the order becomes Completed."],
          },
          {
            title: "Delete orders",
            body: "Tick the orders, then Delete. Orders with payments are kept: cancel them instead, so the money stays accounted for.",
          },
        ],
      },
      {
        id: "packages",
        title: "Packages",
        summary: "Deliveries customers book: set the price, follow delivery, record payments.",
        iconName: "package",
        route: "/dashboard/packages",
        keywords: ["delivery", "pickup", "destination", "parcel"],
        topics: [
          {
            title: "Price and follow a package",
            body: "Open a package and press Edit to set what it costs (Charged), its status and its delivery. The balance follows the price. Record payments from the package the same way as for an order.",
          },
        ],
      },
      {
        id: "payments",
        title: "Payments",
        summary: "Every payment recorded, for orders and for packages.",
        iconName: "payments",
        route: "/dashboard/payments",
        keywords: ["money", "momo", "airtel", "cash", "transactions", "receipts"],
        topics: [
          {
            title: "Order and package payments",
            body: "Two lists under Payments: order payments and package payments. Filter by method and dates, and export them. To add a payment, open its order or package.",
          },
        ],
      },
    ],
  },
  {
    id: "catalogue",
    title: "Catalogue",
    summary: "What the app sells, and how it is organised.",
    modules: [
      {
        id: "products",
        title: "Products",
        summary: "Add, edit and retire products, with their photos.",
        iconName: "store",
        route: "/dashboard/products",
        keywords: ["product", "price", "stock", "quantity", "photo", "gas", "water", "electronics"],
        topics: [
          {
            title: "Add a product",
            body: "Press New. Pick the inventory type (gas & water, or electronics) first: the form then asks for that type's brand and type. A photo is required, since the app shows every product with its picture.",
            notes: ["The photo shows as a preview before you save. When editing, the current photo shows; choose another to replace it, or Remove."],
          },
          {
            title: "Retire a product",
            body: "Set it Inactive. Products on past orders cannot be deleted, so the orders keep what was bought.",
          },
        ],
      },
      {
        id: "setup",
        title: "Categories, brands and types",
        summary: "The lists products are sorted by, for gas & water and for electronics.",
        iconName: "tag",
        route: "/dashboard/catalog/product-categories",
        keywords: ["category", "brand", "type", "inventory type", "electronics"],
        topics: [
          {
            title: "Keep them tidy",
            body: "Each list works the same: search, filter, View, Edit, New, and tick to delete.",
            warning: "Something still in use cannot be deleted: a category with brands, a brand with products. Make it Inactive instead. (The database would otherwise delete everything under it.)",
          },
        ],
      },
    ],
  },
  {
    id: "app",
    title: "In the app",
    summary: "What customers read in the app.",
    modules: [
      {
        id: "content",
        title: "Adverts, Explore, FAQs and referrals",
        summary: "The banners, articles and questions the app shows; the people customers referred.",
        iconName: "campaign",
        route: "/dashboard/catalog/ads",
        keywords: ["advert", "banner", "ad", "blog", "article", "explore", "faq", "question", "referral"],
        topics: [
          {
            title: "Adverts",
            body: "An advert shows in the app between its start and end dates while Active. Give it a clear picture.",
          },
          {
            title: "Referrals",
            body: "Customers add referrals in the app. You can view and delete them here.",
          },
        ],
      },
    ],
  },
  {
    id: "admin",
    title: "Administration",
    summary: "Accounts, roles and messages to customers. Admins only.",
    modules: [
      {
        id: "accounts",
        title: "Customers & staff",
        summary: "Every account: customers from the app and staff.",
        iconName: "people",
        route: "/dashboard/users",
        keywords: ["user", "customer", "staff", "account", "role", "inactive", "nin"],
        topics: [
          {
            title: "Add staff",
            body: "Press New, fill in the details, choose the role (Admin or Editor) and a password of at least 8 characters. Tell them to change it after signing in.",
          },
          {
            title: "A customer's record",
            body: "Open a customer to see their orders and what they owe. Make an account Inactive to stop it signing in. Accounts with orders or packages cannot be deleted.",
          },
          {
            title: "Message customers",
            body: "Tick customers in the list and press Message to send them a push to their phone, an email, or both.",
          },
        ],
      },
      {
        id: "messages",
        title: "Messages to customers",
        summary: "Send to everyone or to picked customers, by push, email or both; see who got it.",
        iconName: "bell",
        route: "/dashboard/messages",
        keywords: ["notification", "push", "email", "broadcast", "announcement", "sms"],
        topics: [
          {
            title: "Send a message",
            body: "Press New message. Choose everyone or picked customers, push, email or both, and write a title and message. The form tells you how many will get it before you send.",
            notes: ["Push reaches customers who have signed in to the app on a phone.", "Email: the mail plan allows 150 emails a day. A send that would go over is refused; send it as push, or to fewer customers."],
          },
          {
            title: "Who got it",
            body: "Open a message from the list to see each customer and whether push and email reached them, with the reason when one did not.",
          },
        ],
      },
      {
        id: "roles",
        title: "Roles & access",
        summary: "What each role may do.",
        iconName: "shield",
        route: "/dashboard/roles",
        keywords: ["permissions", "access", "admin", "editor"],
        topics: [
          {
            title: "Roles",
            body: "Admin can do everything. Editor runs day-to-day work but not accounts, roles or messages. Customer is the mobile app's role.",
          },
        ],
      },
    ],
  },
];

export function topicHaystack(topic: ManualTopic): string {
  return [topic.title, topic.body, ...(topic.steps ?? []), ...(topic.notes ?? []), topic.warning ?? ""].join(" ").toLowerCase();
}
