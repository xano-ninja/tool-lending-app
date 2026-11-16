import { workflowTest, s, ref, c, withFilters, fl } from "@xano/sdk";
import { clearItemPhotoFn, setItemPhotoFn } from "../functions/item_photo.js";
import { itemTable } from "../tables/item.js";

const PIXEL_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const drill = s.db.add({
  table: itemTable,
  row: { name: "drill", category: "power tools", status: "available" },
  as: "drill",
});

const upload = s.storage.create_file_resource({
  filename: c.text("drill.png"),
  filedata: withFilters(c.text(PIXEL_PNG), fl.base64_decode()),
  as: "upload",
});

const setPhoto = (as: string) =>
  s.function.run({ fn: setItemPhotoFn, input: { item_id: ref("drill.id"), photo: ref("upload") }, as });

export const setPhotoTest = workflowTest({
  name: "item photo upload is stored on the item",
  stack: [
    drill,
    upload,
    setPhoto("updated"),
    s.expect.to_not_be_null({ expr: ref("updated.photo.path") }),
    s.expect.to_equal({ expr: ref("updated.photo.meta.width"), value: c.int(1) }),
    s.db.get({ table: itemTable, fieldValue: ref("drill.id"), as: "stored" }),
    s.expect.to_equal({ expr: ref("stored.photo.path"), value: ref("updated.photo.path") }),
    s.expect.to_equal({ expr: ref("stored.name"), value: c.text("drill") }),
  ],
});

export const replacePhotoTest = workflowTest({
  name: "item photo upload replaces the earlier photo",
  stack: [
    drill,
    upload,
    setPhoto("first"),
    setPhoto("second"),
    s.expect.to_not_be_null({ expr: ref("second.photo.path") }),
    s.expect.to_not_equal({ expr: ref("second.photo.path"), value: ref("first.photo.path") }),
  ],
});

export const setPhotoMissingTest = workflowTest({
  name: "item photo upload refuses an unknown item",
  stack: [
    s.expect.to_throw({
      body: [
        upload,
        s.function.run({ fn: setItemPhotoFn, input: { item_id: c.int(999999), photo: ref("upload") } }),
      ],
      exception: c.text("Item not found"),
    }),
  ],
});

export const clearPhotoTest = workflowTest({
  name: "item photo can be removed",
  stack: [
    drill,
    upload,
    setPhoto("updated"),
    s.function.run({ fn: clearItemPhotoFn, input: { item_id: ref("drill.id") }, as: "cleared" }),
    s.expect.to_be_null({ expr: ref("cleared.photo") }),
    s.expect.to_equal({ expr: ref("cleared.status"), value: c.text("available") }),
  ],
});

export const clearNoPhotoTest = workflowTest({
  name: "removing a photo from an item without one is a no-op",
  stack: [
    drill,
    s.function.run({ fn: clearItemPhotoFn, input: { item_id: ref("drill.id") }, as: "cleared" }),
    s.expect.to_be_null({ expr: ref("cleared.photo") }),
  ],
});

export const clearPhotoMissingTest = workflowTest({
  name: "removing a photo refuses an unknown item",
  stack: [
    s.expect.to_throw({
      body: [s.function.run({ fn: clearItemPhotoFn, input: { item_id: c.int(999999) } })],
      exception: c.text("Item not found"),
    }),
  ],
});
