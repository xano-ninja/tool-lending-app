import { workspace } from "@xano/sdk";
import { api } from "./api/group.js";
import { itemsQuery } from "./api/items.js";
import { itemTable } from "./tables/item.js";

export default workspace("tool-lending-app")
  .registerTables([itemTable])
  .registerApiGroups([api])
  .registerQueries([itemsQuery]);
