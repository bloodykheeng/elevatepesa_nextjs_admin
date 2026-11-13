import axiosAPI from "@/services/axiosApi";
import { cleanParams } from "@/services/types/api";
import type { FilterField } from "./FiltersButton";

/**
 * The searchable pickers lists share in their Filters dialog. Each writes the id to one URL
 * key and the label to another, so a reload or a shared link still names what was chosen.
 */

/** One staff account by name, staff ID, email or phone (`account` / `accountName`). Reads /users, so `view users` only. */
export const accountPicker = (label = "Account"): FilterField => ({
  type: "picker",
  key: "account",
  labelKey: "accountName",
  label,
  queryKey: ["users", "account-filter"],
  queryFn: ({ page, search }) => axiosAPI.get("/v1/users", { params: cleanParams({ page, per_page: 10, "filter[search]": search || undefined }) }),
  mapOption: (u: { id: string; name: string; staff_id: string | null; role?: string }) => ({
    value: u.id,
    label: u.staff_id ? `${u.staff_id} · ${u.name}` : u.name,
    note: u.role,
  }),
  placeholder: "Any account",
  searchPlaceholder: "Name, staff ID, email or phone",
});

/** From / To on the URL keys every list uses (`from` / `to`). */
export const dateRange = (label = "Date"): FilterField => ({ type: "dateRange", from: "from", to: "to", label });

/** A fixed list as filter options, when the values are already the words to show. */
export const optionsOf = (values: readonly string[]) => values.map((v) => ({ label: v, value: v }));
