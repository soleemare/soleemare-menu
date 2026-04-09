export type LatLng = {
  lat: number;
  lng: number;
};

export type DeliveryZone = {
  id: string;
  name: string;
  price: number;
  path: LatLng[];
};