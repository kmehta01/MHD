import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const getModuloIndex = (index, count) => ((index % count) + count) % count;

function LoopSlider({
  className,
  trackClassName,
  dotsClassName = "department-slider__dots",
  ariaLabel,
  dotsAriaLabel,
  sliderLabel = "slide",
  children,
  autoplay = true,
  interval = 3500,
}) {
  const trackRef = useRef(null);
  const activeIndexRef = useRef(0);
  const normalizeTimerRef = useRef(null);
  const scrollFrameRef = useRef(null);
  const isAnimatingRef = useRef(false);
  const dragRef = useRef({
    isDragging: false,
    startX: 0,
    startLeft: 0,
    didDrag: false,
  });

  const slides = Children.toArray(children).filter(Boolean);
  const slideCount = slides.length;
  const canLoop = slideCount > 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const setActiveSlide = useCallback(
    (index) => {
      if (slideCount === 0) {
        activeIndexRef.current = 0;
        setActiveIndex(0);
        return;
      }

      const safeIndex = getModuloIndex(index, slideCount);
      activeIndexRef.current = safeIndex;
      setActiveIndex(safeIndex);
    },
    [slideCount],
  );

  const getGap = useCallback(() => {
    const track = trackRef.current;

    if (!track) {
      return 0;
    }

    const styles = window.getComputedStyle(track);
    return parseFloat(styles.columnGap || styles.gap || "0") || 0;
  }, []);

  const getStep = useCallback(() => {
    const track = trackRef.current;

    if (!track || track.children.length === 0) {
      return 0;
    }

    const firstRealSlide = track.children[canLoop ? slideCount : 0];
    return firstRealSlide
      ? firstRealSlide.getBoundingClientRect().width + getGap()
      : 0;
  }, [canLoop, getGap, slideCount]);

  const getLoopWidth = useCallback(() => getStep() * slideCount, [getStep, slideCount]);

  const getActiveLeft = useCallback(
    (index = activeIndexRef.current) => {
      const step = getStep();
      const loopWidth = getLoopWidth();

      if (!step) {
        return 0;
      }

      return canLoop ? loopWidth + step * index : step * index;
    },
    [canLoop, getLoopWidth, getStep],
  );

  const getCurrentIndex = useCallback(() => {
    const track = trackRef.current;
    const step = getStep();
    const loopWidth = getLoopWidth();

    if (!track || !step || slideCount === 0) {
      return 0;
    }

    if (!canLoop || !loopWidth) {
      return getModuloIndex(Math.round(track.scrollLeft / step), slideCount);
    }

    return getModuloIndex(Math.round((track.scrollLeft % loopWidth) / step), slideCount);
  }, [canLoop, getLoopWidth, getStep, slideCount]);

  const normalizeScroll = useCallback(() => {
    const track = trackRef.current;
    const loopWidth = getLoopWidth();

    if (!track || !canLoop || loopWidth <= 1) {
      isAnimatingRef.current = false;
      return;
    }

    const currentLeft = track.scrollLeft;
    let normalizedLeft = currentLeft;

    if (currentLeft < loopWidth - 1) {
      normalizedLeft = currentLeft + loopWidth;
    } else if (currentLeft >= loopWidth * 2 - 1) {
      normalizedLeft = currentLeft - loopWidth;
    }

    if (Math.abs(normalizedLeft - currentLeft) > 1) {
      const previousBehavior = track.style.scrollBehavior;
      const previousSnap = track.style.scrollSnapType;

      track.style.scrollBehavior = "auto";
      track.style.scrollSnapType = "none";
      track.scrollLeft = normalizedLeft;

      window.requestAnimationFrame(() => {
        track.style.scrollBehavior = previousBehavior;
        track.style.scrollSnapType = previousSnap;
      });
    }

    isAnimatingRef.current = false;
    setActiveSlide(getCurrentIndex());
  }, [canLoop, getCurrentIndex, getLoopWidth, setActiveSlide]);

  const queueNormalize = useCallback(
    (delay = 560) => {
      if (normalizeTimerRef.current) {
        window.clearTimeout(normalizeTimerRef.current);
      }

      normalizeTimerRef.current = window.setTimeout(() => {
        normalizeScroll();
        normalizeTimerRef.current = null;
      }, delay);
    },
    [normalizeScroll],
  );

  const scrollToSlide = useCallback(
    (index, options = {}) => {
      const track = trackRef.current;
      const step = getStep();
      const loopWidth = getLoopWidth();

      if (!track || !step || slideCount === 0) {
        return;
      }

      const targetIndex = getModuloIndex(index, slideCount);
      let targetLeft = canLoop ? loopWidth + targetIndex * step : targetIndex * step;

      if (options.forward && canLoop && targetLeft <= track.scrollLeft + 1) {
        targetLeft += loopWidth;
      }

      if (options.backward && canLoop && targetLeft >= track.scrollLeft - 1) {
        targetLeft -= loopWidth;
      }

      setActiveSlide(targetIndex);
      isAnimatingRef.current = true;

      track.scrollTo({
        left: targetLeft,
        behavior: options.instant ? "auto" : "smooth",
      });

      if (canLoop) {
        queueNormalize(options.instant ? 0 : 620);
      }
    },
    [canLoop, getLoopWidth, getStep, queueNormalize, setActiveSlide, slideCount],
  );

  const updateActiveFromScroll = useCallback(() => {
    if (scrollFrameRef.current) {
      return;
    }

    scrollFrameRef.current = window.requestAnimationFrame(() => {
      setActiveSlide(getCurrentIndex());
      scrollFrameRef.current = null;
    });
  }, [getCurrentIndex, setActiveSlide]);

  const snapToNearestSlide = useCallback(() => {
    const track = trackRef.current;
    const step = getStep();

    if (!track || !step || slideCount === 0) {
      return;
    }

    const targetIndex = getCurrentIndex();
    const targetLeft = Math.round(track.scrollLeft / step) * step;

    setActiveSlide(targetIndex);
    isAnimatingRef.current = true;

    track.scrollTo({
      left: targetLeft,
      behavior: "smooth",
    });

    queueNormalize(460);
  }, [getCurrentIndex, getStep, queueNormalize, setActiveSlide, slideCount]);

  useLayoutEffect(() => {
    const track = trackRef.current;

    if (!track || slideCount === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      track.scrollLeft = getActiveLeft(0);
      setActiveSlide(0);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [getActiveLeft, setActiveSlide, slideCount]);

  useEffect(() => {
    if (!autoplay || !canLoop) {
      return undefined;
    }

    const autoplayId = window.setInterval(() => {
      if (dragRef.current.isDragging) {
        return;
      }

      scrollToSlide(activeIndexRef.current + 1, {
        autoplay: true,
        forward: true,
      });
    }, interval);

    return () => window.clearInterval(autoplayId);
  }, [autoplay, canLoop, interval, scrollToSlide]);

  useEffect(() => {
    const handleResize = () => {
      const track = trackRef.current;

      if (!track) {
        return;
      }

      const previousBehavior = track.style.scrollBehavior;
      track.style.scrollBehavior = "auto";
      track.scrollLeft = getActiveLeft(activeIndexRef.current);

      window.requestAnimationFrame(() => {
        track.style.scrollBehavior = previousBehavior;
      });
    };

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [getActiveLeft]);

  useEffect(() => {
    return () => {
      if (normalizeTimerRef.current) {
        window.clearTimeout(normalizeTimerRef.current);
      }

      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }
    };
  }, []);

  const handlePointerDown = (event) => {
    const track = trackRef.current;

    if (!track || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    if (normalizeTimerRef.current) {
      window.clearTimeout(normalizeTimerRef.current);
      normalizeTimerRef.current = null;
    }

    dragRef.current = {
      isDragging: true,
      startX: event.clientX,
      startLeft: track.scrollLeft,
      didDrag: false,
    };

    isAnimatingRef.current = false;
    setIsDragging(true);
    track.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    const track = trackRef.current;
    const drag = dragRef.current;

    if (!track || !drag.isDragging) {
      return;
    }

    const distance = event.clientX - drag.startX;

    if (Math.abs(distance) > 4) {
      drag.didDrag = true;
    }

    track.scrollLeft = drag.startLeft - distance;
    event.preventDefault();
  };

  const finishDrag = (event) => {
    const track = trackRef.current;
    const drag = dragRef.current;

    if (!track || !drag.isDragging) {
      return;
    }

    drag.isDragging = false;
    setIsDragging(false);
    track.releasePointerCapture?.(event.pointerId);
    snapToNearestSlide();
  };

  const handleClickCapture = (event) => {
    if (!dragRef.current.didDrag) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    dragRef.current.didDrag = false;
  };

  const renderedSlides = useMemo(() => {
    const makeSlide = (slide, key, isClone = false) => {
      if (!isValidElement(slide)) {
        return (
          <div key={key} aria-hidden={isClone ? "true" : undefined}>
            {slide}
          </div>
        );
      }

      return cloneElement(slide, {
        key,
        "aria-hidden": isClone ? "true" : slide.props["aria-hidden"],
        "data-slider-clone": isClone ? "true" : undefined,
        inert: isClone ? true : undefined,
      });
    };

    if (!canLoop) {
      return slides.map((slide, index) => makeSlide(slide, `slide-${index}`));
    }

    return [
      ...slides.map((slide, index) => makeSlide(slide, `before-${index}`, true)),
      ...slides.map((slide, index) => makeSlide(slide, `slide-${index}`)),
      ...slides.map((slide, index) => makeSlide(slide, `after-${index}`, true)),
    ];
  }, [canLoop, slides]);

  return (
    <div className={className}>
      <div
        ref={trackRef}
        className={`${trackClassName}${isDragging ? " is-dragging" : ""}`}
        tabIndex={0}
        aria-label={ariaLabel}
        onScroll={updateActiveFromScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onClickCapture={handleClickCapture}
      >
        {renderedSlides}
      </div>

      <div className={dotsClassName} aria-label={dotsAriaLabel}>
        {slides.map((_, index) => (
          <button
            key={index}
            type="button"
            className={index === activeIndex ? "is-active" : ""}
            aria-label={`Go to ${sliderLabel} ${index + 1}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => scrollToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
}

export default LoopSlider;
