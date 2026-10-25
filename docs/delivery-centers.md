# Delivery location suggestions

The order form includes the existing admin-managed locations and a snapshot of
Tesla's published delivery-center directories. The snapshot was checked on
2026-10-25 and contains 136 US, 23 Canadian, and 59 mainland Chinese locations.
The exact source URLs are recorded in
[`src/data/tesla-delivery-centers.json`](../src/data/tesla-delivery-centers.json).

Tesla's [global Find Us directory](https://www.tesla.com/findus/list) does not
offer a dedicated delivery-center list for every market. In particular, its
Israel entries are stores and service centers; the directory does not establish
which of them will hand over a specific order. Users can therefore type their
actual delivery location if it is absent from the suggestions.

To refresh the snapshot, compare each source directory with the JSON file and
update locations that have opened, closed, or changed names. The order form
only suggests snapshot entries for the selected country. Admin-managed
locations remain available alongside them.
