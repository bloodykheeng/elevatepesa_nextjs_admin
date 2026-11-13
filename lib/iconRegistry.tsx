import type { IconType } from "react-icons";
import {
  MdOutlineShoppingCart,
  MdOutlineInventory2,
  MdOutlineStorefront,
  MdOutlineLocalOffer,
  MdOutlineCampaign,
  MdOutlineLocalShipping,
  MdOutlineCalculate,
  MdOutlinePayments,
  MdOutlineSms,
  MdOutlineCategory,
  MdDashboard,
  MdAssignment,
  MdBarChart,
  MdMap,
  MdRoute,
  MdPeople,
  MdSettings,
  MdAssessment,
  MdTrackChanges,
  MdLocationCity,
  MdDownload,
  MdManageAccounts,
  MdHistory,
  MdFolder,
  MdDescription,
  MdOutlineGavel,
  MdOutlineVerified,
  MdOutlineMonitorHeart,
  MdOutlinePlace,
  MdOutlineGroups,
  MdOutlineHelpOutline,
  MdOutlineCalendarMonth,
  MdOutlineEventNote,
  MdOutlineDns,
  MdOutlineAdminPanelSettings,
  MdOutlineApartment,
  MdOutlineAccountBalance,
  MdOutlineLayers,
  MdOutlineHomeWork,
  MdOutlineHolidayVillage,
  MdOutlineFlag,
  MdOutlineFormatListBulleted,
  MdOutlineStraighten,
  MdOutlineFactCheck,
  MdOutlineStarBorder,
  MdOutlineBadge,
  MdOutlineNotificationsActive,
  MdOutlineChatBubbleOutline,
  MdOutlineAccountBalanceWallet,
  MdOutlineReceiptLong,
} from "react-icons/md";

const iconRegistry: Record<string, IconType> = {
  cart: MdOutlineShoppingCart,
  package: MdOutlineLocalShipping,
  inventory: MdOutlineInventory2,
  store: MdOutlineStorefront,
  tag: MdOutlineLocalOffer,
  campaign: MdOutlineCampaign,
  dashboard: MdDashboard,
  payments: MdOutlinePayments,
  wallet: MdOutlineAccountBalanceWallet,
  ledger: MdOutlineReceiptLong,
  bank: MdOutlineAccountBalance,
  sms: MdOutlineSms,
  category: MdOutlineCategory,
  assignment: MdAssignment,
  chart: MdBarChart,
  map: MdMap,
  people: MdPeople,
  settings: MdSettings,
  assessment: MdAssessment,
  tracking: MdTrackChanges,
  route: MdRoute,
  city: MdLocationCity,
  download: MdDownload,
  manage: MdManageAccounts,
  history: MdHistory,
  folder: MdFolder,
  document: MdDescription,
  gavel: MdOutlineGavel,
  verified: MdOutlineVerified,
  monitor: MdOutlineMonitorHeart,
  place: MdOutlinePlace,
  groups: MdOutlineGroups,
  help: MdOutlineHelpOutline,
  bell: MdOutlineNotificationsActive,
  chat: MdOutlineChatBubbleOutline,
  calendar: MdOutlineCalendarMonth,
  event: MdOutlineEventNote,
  queue: MdOutlineDns,
  shield: MdOutlineAdminPanelSettings,
  apartment: MdOutlineApartment,
  vote: MdOutlineAccountBalance,
  layers: MdOutlineLayers,
  homework: MdOutlineHomeWork,
  village: MdOutlineHolidayVillage,
  flag: MdOutlineFlag,
  list: MdOutlineFormatListBulleted,
  ruler: MdOutlineStraighten,
  inspection: MdOutlineFactCheck,
  star: MdOutlineStarBorder,
  idcard: MdOutlineBadge,
  calculator: MdOutlineCalculate,
};

export function getIcon(name: string): IconType | undefined {
  return iconRegistry[name];
}

/**
 * Render a registry icon as an element.
 *
 * Returns an ELEMENT, not a component type, and that is the point. Handing a
 * looked-up component back to a caller who then writes `<Icon />` makes React
 * see a component type it cannot prove is stable, so it assumes a new type on
 * every render and would remount that subtree, resetting its state. Creating the
 * element here keeps every JSX tag in the app a fixed, statically known type.
 *
 * Prefer this over `getIcon` in render paths. `getIcon` stays exported for
 * anything that genuinely needs the component itself.
 */
export function renderIcon(
  name: string | undefined,
  className: string
): React.ReactNode {
  const Icon = name ? iconRegistry[name] : undefined;

  return Icon ? <Icon className={className} /> : null;
}
