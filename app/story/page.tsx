import { Chrome } from "../components/Chrome";
import { LandingScroll } from "../components/landing/LandingScroll";

/** Previous scroll storytelling homepage, kept as an explicit backup route. */
export default function StoryHomePage() {
  return (
    <div className="home">
      <Chrome current="home" />
      <main id="content">
        <LandingScroll />
      </main>
    </div>
  );
}
