/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("bookings")

  collection.fields.add(new Field({
    "id": "date_expires_at",
    "name": "expires_at",
    "type": "date",
    "system": false,
    "required": false,
    "presentable": false
  }))

  collection.fields.add(new Field({
    "id": "text_hold_token",
    "name": "hold_token",
    "type": "text",
    "system": false,
    "required": false,
    "presentable": false
  }))

  app.save(collection)

  // Create partial unique index
  app.db().newQuery("CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_overlap ON bookings (assigned_station_id, start_time) WHERE status != 'cancelled'").execute()
}, (app) => {
  const collection = app.findCollectionByNameOrId("bookings")

  collection.fields.removeById("date_expires_at")
  collection.fields.removeById("text_hold_token")

  app.save(collection)

  app.db().newQuery("DROP INDEX IF EXISTS idx_booking_overlap").execute()
})
