import { defineFunction, input, inp, expr, s, ref, c, guard, fl, withFilters } from "@xano/sdk";
import { itemTable } from "../tables/item.js";

const dropOldPhoto = s.conditional({
  when: expr(ref("item.photo.path", { safe: true }), "!=", c.null()),
  then: [s.storage.delete_file({ pathname: ref("item.photo.path") })],
});

export const setItemPhotoFn = defineFunction({
  name: "set_item_photo",
  description: "Store an uploaded image as the item's photo, replacing any earlier one.",
  input: {
    item_id: input.int({ required: true }),
    photo: input.file({ required: true }),
  },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("item_id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.storage.read_file_resource({ value: inp("photo"), as: "upload" }),
    s.precondition({
      expr: expr(withFilters(ref("upload.mime"), fl.starts_with("image/")), "=", c.bool(true)),
      error_type: "inputerror",
      error: c.text("Photo must be an image."),
    }),
    s.storage.create_image({ value: inp("photo"), access: "public", as: "image" }),
    s.db.edit({
      table: itemTable,
      fieldValue: inp("item_id"),
      row: { photo: ref("image") },
      as: "updated",
    }),
    dropOldPhoto,
  ],
  response: ref("updated"),
});

export const clearItemPhotoFn = defineFunction({
  name: "clear_item_photo",
  description: "Remove the item's photo and its stored file.",
  input: { item_id: input.int({ required: true }) },
  stack: [
    s.db.get({ table: itemTable, fieldValue: inp("item_id"), as: "item" }),
    guard.found("item", { message: "Item not found." }),
    s.db.edit({
      table: itemTable,
      fieldValue: inp("item_id"),
      row: { photo: c.null() },
      as: "updated",
    }),
    dropOldPhoto,
  ],
  response: ref("updated"),
});
