/** Lets TypeScript accept side-effect imports of stylesheets; the bundler handles them. */
declare module "*.css";

/** The bundler copies an imported SVG and gives its hashed URL. */
declare module "*.svg" {
  const url: string;
  export default url;
}
