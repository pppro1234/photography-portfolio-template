import Intro from "./Intro";
import Gallery from "./Gallery";

export default function WorkPage({ category = "all", title, description }) {
  return (
    <div id="top" className="relative bg-white min-h-screen pt-32 md:pt-36 text-black font-sans selection:bg-black selection:text-white">
      <main id="main-content" tabIndex={-1}>
        <Intro home={category === "all"} title={title} description={description} />
        <Gallery category={category} />
      </main>
    </div>
  );
}
