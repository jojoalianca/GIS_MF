document.addEventListener("DOMContentLoaded", function () {
    var sidebar  = document.getElementById("mainSidebar");
    var overlay  = document.getElementById("sidebarOverlay");
    var openBtn  = document.getElementById("sidebarToggle");
    var closeBtn = document.getElementById("sidebarClose");

    function openSidebar() {
        if (!sidebar || !overlay) return;
        sidebar.classList.add("active");
        overlay.classList.add("active");
        document.body.style.overflow = "hidden";
    }

    function closeSidebar() {
        if (!sidebar || !overlay) return;
        sidebar.classList.remove("active");
        overlay.classList.remove("active");
        document.body.style.overflow = "";
    }

    if (openBtn)  openBtn.addEventListener("click", openSidebar);
    if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
    if (overlay)  overlay.addEventListener("click", closeSidebar);

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && sidebar && sidebar.classList.contains("active")) {
            closeSidebar();
        }
    });

    document.querySelectorAll(".sidebar-menu a").forEach(function (link) {
        link.addEventListener("click", function () {
            if (window.innerWidth <= 768) {
                setTimeout(closeSidebar, 200);
            }
        });
    });
});