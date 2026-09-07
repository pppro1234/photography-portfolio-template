import site from "../site-config.json";
import profiles from "../social-profiles.json";
import { getSocialLinks } from "./social-platforms.mjs";

export { site };
export const contactLinks = getSocialLinks(profiles);
