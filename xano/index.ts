import { workspace } from "@xano/sdk";
import { registerAuth } from "@xano-sdk/auth";
import { api } from "./api/group.js";
import { createItemQuery, itemQuery, itemsQuery, updateItemQuery } from "./api/items.js";
import { itemTable } from "./tables/item.js";

const app = workspace("tool-lending-app")
  .registerTables([itemTable])
  .registerApiGroups([api])
  .registerQueries([itemsQuery, itemQuery, createItemQuery, updateItemQuery]);

export default registerAuth(app, { canonical: "authn" });
