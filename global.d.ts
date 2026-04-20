declare module "*.geojson" {
  const value: GeoJSON.FeatureCollection;
  export default value;
}

declare module "@/features/account/components/profile-page-layout" {
  import ProfilePageLayout from "@/features/account/profile-page-layout";
  export default ProfilePageLayout;
}

declare module "@/features/account/data/profile" {
  export { ACCOUNT_PROFILE } from "@/features/account/profile";
}
