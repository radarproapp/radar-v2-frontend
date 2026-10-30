import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { MarketingLayout } from "../MarketingLayout";
import { renderPage } from "../../test/harness";

/// The public site's header, which did not fit a phone.
///
/// At 420px the logo took one row, the three links a second and Sign in/Start free a third — 160px
/// of navigation above a 420px screen. The links and "Sign in" now live in a disclosure menu that
/// CSS shows only below 860px.
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
    expect(labels).toEqual(["Product", "Institutions", "How it works", "Sign in"]);
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

  it("still offers Start free without opening anything", () => {
    renderPage(<MarketingLayout>{null}</MarketingLayout>);

    // The one action worth a tap on arrival stays on the header row rather than moving into the
    // menu, so collapsing the navigation does not also hide the way in.
    expect(screen.getByRole("link", { name: /start free/i }).getAttribute("href")).toBe("/onboarding");
  });
});
