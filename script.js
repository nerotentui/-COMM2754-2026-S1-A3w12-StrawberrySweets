/* Toggles opening and closing the inner Works dropdown elements */
function myFunction(event) {
  event.stopPropagation();
  document.getElementById("myDropdown").classList.toggle("show");
}

/* Toggles mobile navigation view and dynamically switches between hamburger and close icons */
function toggleMobileMenu() {
  const navMenu = document.getElementById("navLinksMenu");
  const toggleImg = document.getElementById("menuToggleImg");

  // Toggle the active class on the layout menu drawer
  navMenu.classList.toggle("mobile-active");

  // Check if menu is open or closed and swap image path names
  if (navMenu.classList.contains("mobile-active")) {
    toggleImg.src = "image/COMM2754-2026-S1-A3w12-StrawberrySweets-close.png";
    toggleImg.alt = "Close Menu";
  } else {
    toggleImg.src = "image/menu bar.png";
    toggleImg.alt = "Open Menu";
  }
}

/* Defensive Utility: Handles clicking outside elements and auto-resets standard drawer icon state */
window.onclick = function (event) {
  // Close active Works dropdowns if clicking out of boundary target rules
  if (
    !event.target.matches(".dropbtn") &&
    !event.target.matches(".dropbtn *")
  ) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains("show")) {
        openDropdown.classList.remove("show");
      }
    }
  }
};

window.audioVolume = 0.5;
window.audioMuted = false;

const slider = document.getElementById("volume-slider");
const thumb = document.getElementById("slider-thumb");
const muteBtn = document.getElementById("mute-btn");

let isDraggingSlider = false;

function updateThumbPosition(volume) {
  if (thumb) {
    thumb.style.left = `${volume * 100}%`;
  }
}

// DEFENSIVE GUARD: Only mount listeners if audio UI controls exist on the active page layout
if (slider && thumb && muteBtn) {
  // Set initial visual position to match our 50% start volume
  updateThumbPosition(window.audioVolume);

  function processSliderMove(e) {
    const rect = slider.getBoundingClientRect();

    // Accept standard desktop cursor coords or mobile screen touch positions
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;

    // Determine pixel placement tracking relative to left side of the track element
    let offsetX = clientX - rect.left;
    let percentage = offsetX / rect.width;

    // Strict boundaries constraint checks
    if (percentage < 0) percentage = 0;
    if (percentage > 1) percentage = 1;

    window.audioVolume = percentage;
    updateThumbPosition(percentage);
  }

  // Desktop Interaction Listeners
  slider.addEventListener("mousedown", (e) => {
    isDraggingSlider = true;
    processSliderMove(e);
  });

  window.addEventListener("mousemove", (e) => {
    if (isDraggingSlider) processSliderMove(e);
  });

  window.addEventListener("mouseup", () => {
    isDraggingSlider = false;
  });

  // Mobile Responsive Touch Listeners
  slider.addEventListener("touchstart", (e) => {
    isDraggingSlider = true;
    processSliderMove(e);
  });

  window.addEventListener("touchmove", (e) => {
    if (isDraggingSlider) processSliderMove(e);
  });

  window.addEventListener("touchend", () => {
    isDraggingSlider = false;
  });

  // Mute Button Toggle Handler
  muteBtn.addEventListener("click", () => {
    window.audioMuted = !window.audioMuted;
    if (window.audioMuted) {
      muteBtn.textContent = "Unmute";
      muteBtn.classList.add("muted");
    } else {
      muteBtn.textContent = "Mute";
      muteBtn.classList.remove("muted");
    }
  });
}
