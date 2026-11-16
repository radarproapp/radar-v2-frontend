import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { FeedTabs } from "../FeedTabs";
import { renderPage } from "../../test/harness";

/// The brief's two columns, as tabs.
///
/// Side by side is a desktop idea — at phone width it means two half-width columns and neither
/// reads. These cover the behaviour that makes tabs work as a substitute: the state is announced,
/// the keyboard can reach both, and an empty surface does not advertise its emptiness.
describe("FeedTabs", () => {
  it("announces which surface is showing", () => {
    renderPage(<FeedTabs active="information" onChange={() => {}} />);

    expect(screen.getByRole("tab", { name: /Information/ }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: /Opportunities/ }).getAttribute("aria-selected")).toBe("false");
  });

  it("switches on a tap", () => {
    const onChange = vi.fn();
    renderPage(<FeedTabs active="information" onChange={onChange} />);

    fireEvent.click(screen.getByRole("tab", { name: /Opportunities/ }));

    expect(onChange).toHaveBeenCalledWith("opportunities");
  });

  /// A tablist is one stop in the tab order and arrows move within it. Without this every tab is
  /// a separate stop, and a keyboard user pays for the pattern rather than being helped by it.
  it("is one stop in the tab order", () => {
    renderPage(<FeedTabs active="information" onChange={() => {}} />);

    expect(screen.getByRole("tab", { name: /Information/ }).getAttribute("tabindex")).toBe("0");
    expect(screen.getByRole("tab", { name: /Opportunities/ }).getAttribute("tabindex")).toBe("-1");
  });

  it("moves between tabs with the arrow keys", () => {
    const onChange = vi.fn();
    renderPage(<FeedTabs active="information" onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });

    expect(onChange).toHaveBeenCalledWith("opportunities");
  });

  /// "Opportunities 0" is a statement about emptiness; "Opportunities" is a place to look. The
  /// count earns its place only when there is something to count.
  it("shows a count only when there is something to count", () => {
    const { rerender } = renderPage(
      <FeedTabs active="information" onChange={() => {}} counts={{ opportunities: 0 }} />,
    );

    expect(screen.queryByText("0")).toBeNull();

    rerender(<FeedTabs active="information" onChange={() => {}} counts={{ opportunities: 4 }} />);

    expect(screen.getByText("4")).toBeTruthy();
  });
});
