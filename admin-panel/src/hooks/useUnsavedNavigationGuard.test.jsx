import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import useUnsavedNavigationGuard from "./useUnsavedNavigationGuard";

const Editor = ({ onDiscard }) => {
  const [dirty, setDirty] = useState(true);
  const guard = useUnsavedNavigationGuard(dirty);
  return (
    <div>
      <Link to="/destination">Leave editor</Link>
      {guard.open ? (
        <div role="dialog">
          <button onClick={guard.keepEditing} type="button">Keep editing</button>
          <button onClick={() => guard.discardAndProceed(() => { onDiscard(); setDirty(false); })} type="button">Discard</button>
        </div>
      ) : null}
    </div>
  );
};

describe("useUnsavedNavigationGuard", () => {
  it("cancels or proceeds only with the router-provided internal destination", async () => {
    const onDiscard = vi.fn();
    const router = createMemoryRouter([
      { path: "/", element: <Editor onDiscard={onDiscard} /> },
      { path: "/destination", element: <h1>Destination</h1> },
    ]);
    render(<RouterProvider router={router} />);

    fireEvent.click(screen.getByRole("link", { name: "Leave editor" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(router.state.location.pathname).toBe("/");

    fireEvent.click(screen.getByRole("link", { name: "Leave editor" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(await screen.findByRole("heading", { name: "Destination" })).toBeInTheDocument();
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(router.state.location.pathname).toBe("/destination");
  });
});
