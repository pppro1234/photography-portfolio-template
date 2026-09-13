import Intro from "./Intro";
import Gallery from "./Gallery";

export default function WorkPage({ category = "all", title, description, galleryOverride }) {
  return (
    <div id="top" className="work-page relative bg-background min-h-screen pt-32 md:pt-36 font-sans">
      <main id="main-content" tabIndex={-1}>
        <Intro home={category === "all"} category={category} title={title} description={description} />
        {galleryOverride ?? <Gallery category={category} />}
      </main>
    </div>
  );
}
