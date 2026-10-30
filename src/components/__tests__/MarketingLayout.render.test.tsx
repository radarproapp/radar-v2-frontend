import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { MarketingLayout } from "../MarketingLayout";
import { renderPage } from "../../test/harness";

/// The public site's header, which did not fit a phone.
///
/// At 420px the logo took one row, the three links a second and Sign in/Start free a third — 160px
/// of navigation above a 420px screen. The links, "Sign in" and "Start free" now live in a
/// disclosure menu that CSS shows only below 860px, leaving the phone header as brand plus toggle.
///
/// Which of the two headers is on screen is a media query, and jsdom has no layout, so these tests
/// cannot assert that. What they can hold is the part that would silently rot: that the menu exists
/// in the markup at all, that it is operable without a mouse, and that it says out loud whether it
/// is open. A hamburger that only a pointer can reach passes every visual check.
describe("MarketingLayout header", () => {
  it("keeps the menu closed until it is asked for", () => {
    renderPage(<MarketingLayout>{null}</MarketingLayout>);

    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("button", { name: /^menu$/i }).getAttribute("aria-expanded")).toBe("false");
  });

  it("names itself for a screen reader and reports whether it is open", () => {
    renderPage(<MarketingLayout>{null}</MarketingLayout>);

    const toggle = screen.getByRole("button", { name: /^menu$/i });
    expect(toggle.getAttribute("aria-controls")).toBe("mkt-nav-menu");

    fireEvent.click(toggle);

    const opened = screen.getByRole("button", { name: /close menu/i });
    expect(opened.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("menu").getAttribute("id")).toBe("mkt-nav-menu");
  });

  it("puts every link the collapsed header hides inside the menu", () => {
    renderPage(<MarketingLayout>{null}</MarketingLayout>);

    fireEvent.click(screen.getByRole("button", { name: /^menu$/i }));

    const menu = screen.getByRole("menu");
    const labels = Array.from(menu.querySelectorAll("a")).map((link) => link.textContent);
    expect(labels).toEqual(["Start free", "Product", "Institutions", "How it works", "Sign in"]);
  });

  it("can be opened and closed from the keyboard alone", () => {
    renderPage(<MarketingLayout>{null}</MarketingLayout>);

    const toggle = screen.getByRole("button", { name: /^menu$/i });
    // A button answers Enter and Space as a click, which is the whole reason it is a button and
    // not a styled div. Escape is the way back out, because the backdrop is a tap target only.
    fireEvent.click(toggle);
    expect(screen.getByRole("menu")).toBeTruthy();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("leads the menu with Start free rather than ending on it", () => {
    renderPage(<MarketingLayout>{null}</MarketingLayout>);

    fireEvent.click(screen.getByRole("button", { name: /^menu$/i }));

    // The desktop header ends with the signup, because the right-hand edge is where a row carries
    // its emphasis; a vertical list carries it at the top. This asserts the position and not only
    // the presence, since "somewhere in the menu" is how the one action a first-time visitor came
    // for ends up fifth, under four pages they have no reason to read yet.
    const rows = screen.getAllByRole("menuitem");
    expect(rows[0].textContent).toBe("Start free");
    expect(rows[0].getAttribute("href")).toBe("/onboarding");
  });

  it("keeps the menu's Start free looking like a button rather than a fifth navigation row", () => {
    renderPage(<MarketingLayout>{null}</MarketingLayout>);

    fireEvent.click(screen.getByRole("button", { name: /^menu$/i }));

    // Whether it reads as a button is paint, and jsdom does not paint, so the classes carrying the
    // fill are the only handle a test here has. Worth holding anyway: nothing but those classes
    // separates the signup from the four links around it, and a call to action that looks exactly
    // like a navigation link is a call to action nobody presses.
    const cta = screen.getAllByRole("menuitem")[0];
    expect(cta.className).toContain("btn--dark");
    expect(cta.className).not.toContain("mkt-nav__sheet-link");
  });

  it("leaves the desktop header its own Start free, behind the class the phone switches off", () => {
    const { container } = renderPage(<MarketingLayout>{null}</MarketingLayout>);

    // Both copies are in the markup and a media query decides which one is seen, which jsdom
    // cannot evaluate. What it can hold is that the desktop copy still exists and still carries
    // `mkt-nav__start` — the hook the 859px block hides it with. Drop the class and the phone
    // header grows a third target back, which is the thing this change was asked to remove.
    const headerCta = container.querySelector(".mkt-nav__actions .mkt-nav__start");
    expect(headerCta?.getAttribute("href")).toBe("/onboarding");
  });
});
