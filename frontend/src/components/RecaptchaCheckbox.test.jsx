import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RecaptchaCheckbox from "./RecaptchaCheckbox";

describe("RecaptchaCheckbox", () => {
  beforeEach(() => {
    window.grecaptcha = {
      ready: (callback) => callback(),
      render: vi.fn(() => 17),
      reset: vi.fn(),
    };
  });

  afterEach(() => {
    delete window.grecaptcha;
    document.getElementById("google-recaptcha-v2")?.remove();
  });

  it("renders Google reCAPTCHA v2 with the public site key", async () => {
    render(<RecaptchaCheckbox onChange={vi.fn()} siteKey="public-site-key" />);
    await waitFor(() => expect(window.grecaptcha.render).toHaveBeenCalled());
    expect(window.grecaptcha.render.mock.calls[0][1].sitekey).toBe("public-site-key");
  });

  it("clears and resets an issued token after a rejected submission", async () => {
    const onChange = vi.fn();
    const view = render(<RecaptchaCheckbox onChange={onChange} resetVersion={0} siteKey="public-site-key" />);
    await waitFor(() => expect(window.grecaptcha.render).toHaveBeenCalled());
    view.rerender(<RecaptchaCheckbox onChange={onChange} resetVersion={1} siteKey="public-site-key" />);
    expect(window.grecaptcha.reset).toHaveBeenCalledWith(17);
    expect(onChange).toHaveBeenCalledWith("");
  });
});
