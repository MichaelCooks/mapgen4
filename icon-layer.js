document.addEventListener('DOMContentLoaded', () => {
    const iconLayer = document.getElementById('icon-layer');
    const iconModeButton = document.getElementById('button-icon-mode');
    const deleteModeButton = document.getElementById('button-delete-mode');
    const clearIconsButton = document.getElementById('button-clear-icons');
    const iconColorPicker = document.getElementById('icon-color-picker');
  
    const exportIconsButton = document.getElementById('button-download-icons');
    const importIconsButton = document.getElementById('button-import-icons');
    const importIconsInput = document.getElementById('input-import-icons');
  
    const iconButtons = {
        town: document.getElementById('icon-town'),
        castle: document.getElementById('icon-castle'),
        city: document.getElementById('icon-city'),
        tree: document.getElementById('icon-tree'),
      };
  
    const ICON_SVGS = {
      town: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <rect x="12" y="26" width="40" height="24" rx="2" fill="currentColor"></rect>
          <polygon points="32,10 8,28 56,28" fill="currentColor"></polygon>
          <rect x="28" y="36" width="8" height="14" fill="white"></rect>
        </svg>
      `,
      castle: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <rect x="10" y="24" width="44" height="28" fill="currentColor"></rect>
          <rect x="14" y="14" width="8" height="14" fill="currentColor"></rect>
          <rect x="28" y="14" width="8" height="14" fill="currentColor"></rect>
          <rect x="42" y="14" width="8" height="14" fill="currentColor"></rect>
          <rect x="28" y="36" width="8" height="16" fill="white"></rect>
        </svg>
      `,
      city: `
      <svg xmlns="http://www.w3.org/2000/svg" baseProfile="full" viewBox="0 0 76 76">
        <rect x="23.173" y="37.206" width="13.936" height="17.339" fill="currentColor"/>
        <rect x="24.631" y="24.323" width="11.019" height="11.019" fill="currentColor"/>
        <rect x="45.049" y="33.722" width="11.181" height="22.038" fill="currentColor"/>
        <path fill="currentColor" d="M44.333 30.083H57V57H44.333V30.083zm1.98 5.146V38h2.77v-2.77h-2.77zm5.937 0V38h2.77v-2.77h-2.77zm-5.938 4.75v2.771h2.771v-2.77h-2.77zm5.938 0v2.771h2.77v-2.77h-2.77zm-5.938 4.75V47.5h2.771v-2.77h-2.77zm5.938 0V47.5h2.77v-2.77h-2.77zm-5.938 4.75v2.771h2.771v-2.77h-2.77zm5.938 0v2.771h2.77v-2.77h-2.77zm-28.5-24.146l1.583-3.166h1.584v-3.959H28.5v3.959h3.167v-3.959h1.583v3.959h1.583l1.584 3.166v9.5h2.375l2.375 2.375V57H19V37.208l2.375-2.375h2.375v-9.5zm1.98 1.98v2.77h2.374v-2.77H25.73zm6.332 0v2.77h2.376v-2.77h-2.376zm-6.333 4.75v2.77h2.375v-2.77H25.73zm6.334 0v2.77h2.374v-2.77h-2.374zm-1.188 7.916h-1.98v2.771h1.98v-2.77zm-6.333 0v2.771h2.375v-2.77h-2.375zm11.479 0H33.25v2.771h2.77v-2.77zm-5.146 4.75h-1.98V47.5h1.98v-2.77zm-3.958 0h-2.375V47.5h2.375v-2.77zm9.104 0H33.25V47.5h2.77v-2.77zm-5.146 4.75h-1.98v2.771h1.98v-2.77zm-3.958 0h-2.375v2.771h2.375v-2.77zm9.104 0H33.25v2.771h2.77v-2.77z"/>
      </svg>
    `,
      tree: `
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <polygon points="32,10 16,32 48,32" fill="currentColor"></polygon>
          <polygon points="32,20 14,42 50,42" fill="currentColor"></polygon>
          <rect x="28" y="42" width="8" height="12" fill="currentColor"></rect>
        </svg>
      `
    };
  
    let iconMode = false;
    let deleteMode = false;
    let selectedIconType = 'town';
    let selectedIconColor = iconColorPicker ? iconColorPicker.value : '#6b3f2a';
    let icons = [];
  
    function makeId() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      return String(Date.now() + Math.random());
    }
  
    function setCurrentIconButton() {
      Object.entries(iconButtons).forEach(([key, btn]) => {
        if (!btn) return;
        btn.classList.toggle('current-control', key === selectedIconType && !deleteMode);
        btn.style.color = selectedIconColor;
      });
    }
  
    function updateModeUI() {
      if (iconModeButton) {
        iconModeButton.textContent = `Place Icons: ${iconMode ? 'On' : 'Off'}`;
        iconModeButton.classList.toggle('current-control', iconMode);
      }
  
      if (deleteModeButton) {
        deleteModeButton.textContent = `Delete Icons: ${deleteMode ? 'On' : 'Off'}`;
        deleteModeButton.classList.toggle('current-control', deleteMode);
      }
  
      if (iconLayer) {
        iconLayer.classList.toggle('icon-mode-active', iconMode || deleteMode);
        iconLayer.style.cursor = deleteMode ? 'not-allowed' : (iconMode ? 'copy' : '');
      }
  
      setCurrentIconButton();
    }
  
    function setIconMode(enabled) {
      iconMode = enabled;
      if (enabled) {
        deleteMode = false;
      }
      updateModeUI();
    }
  
    function setDeleteMode(enabled) {
      deleteMode = enabled;
      if (enabled) {
        iconMode = false;
      }
      updateModeUI();
    }
  
    function getRelativePosition(event) {
      const rect = iconLayer.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
  
      return {
        x: Math.max(0, Math.min(1, x)),
        y: Math.max(0, Math.min(1, y)),
      };
    }
  
    function renderIcons() {
      if (!iconLayer) return;
  
      iconLayer.innerHTML = '';
  
      for (const icon of icons) {
        const el = document.createElement('div');
        el.className = 'map-icon';
        el.dataset.id = icon.id;
        el.style.left = `${icon.x * 100}%`;
        el.style.top = `${icon.y * 100}%`;
        el.style.color = icon.color || '#6b3f2a';
        el.innerHTML = ICON_SVGS[icon.type] || ICON_SVGS.town;
  
        el.addEventListener('click', (event) => {
          event.stopPropagation();
  
          if (deleteMode) {
            icons = icons.filter(item => item.id !== icon.id);
            renderIcons();
            return;
          }
  
          if (!iconMode) return;
        });
  
        el.addEventListener('contextmenu', (event) => {
          event.preventDefault();
  
          if (!iconMode && !deleteMode) return;
  
          icons = icons.filter(item => item.id !== icon.id);
          renderIcons();
        });
  
        iconLayer.appendChild(el);
      }
    }
  
    function addIcon(x, y, type) {
      icons.push({
        id: makeId(),
        x,
        y,
        type,
        color: selectedIconColor,
      });
      renderIcons();
    }
  
    if (iconModeButton) {
      iconModeButton.addEventListener('click', () => {
        setIconMode(!iconMode);
      });
    }
  
    if (deleteModeButton) {
      deleteModeButton.addEventListener('click', () => {
        setDeleteMode(!deleteMode);
      });
    }
  
    if (clearIconsButton) {
      clearIconsButton.addEventListener('click', () => {
        if (!icons.length) return;
        const confirmed = window.confirm('Clear all placed icons? This action cannot be undone.');
        if (!confirmed) return;
        icons = [];
        renderIcons();
      });
    }
  
    if (iconColorPicker) {
      iconColorPicker.addEventListener('input', () => {
        selectedIconColor = iconColorPicker.value;
        setCurrentIconButton();
      });
    }
  
    Object.entries(iconButtons).forEach(([key, btn]) => {
      if (!btn) return;
  
      btn.addEventListener('click', () => {
        selectedIconType = key;
        setIconMode(true);
      });
    });
  
    if (iconLayer) {
      iconLayer.addEventListener('click', (event) => {
        if (!iconMode) return;
        const pos = getRelativePosition(event);
        addIcon(pos.x, pos.y, selectedIconType);
      });
  
      iconLayer.addEventListener('contextmenu', (event) => {
        event.preventDefault();
      });
    }
  
    if (exportIconsButton) {
      exportIconsButton.addEventListener('click', () => {
        const payload = {
          version: 1,
          icons,
        };
  
        const blob = new Blob(
          [JSON.stringify(payload, null, 2)],
          { type: 'application/json' }
        );
  
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'mapgen4-map-icons.json';
        link.click();
        URL.revokeObjectURL(url);
      });
    }
  
    if (importIconsButton && importIconsInput) {
      importIconsButton.addEventListener('click', () => {
        importIconsInput.click();
      });
  
      importIconsInput.addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
  
        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
  
          if (!parsed || !Array.isArray(parsed.icons)) {
            throw new Error('Invalid icon file format');
          }
  
          icons = parsed.icons
            .filter(icon =>
              typeof icon?.x === 'number' &&
              typeof icon?.y === 'number' &&
              typeof icon?.type === 'string' &&
              ICON_SVGS[icon.type]
            )
            .map(icon => ({
              id: makeId(),
              x: Math.max(0, Math.min(1, icon.x)),
              y: Math.max(0, Math.min(1, icon.y)),
              type: icon.type,
              color: typeof icon.color === 'string' ? icon.color : '#6b3f2a',
            }));
  
          renderIcons();
        } catch (error) {
          alert('Could not import icons JSON.');
          console.error(error);
        } finally {
          event.target.value = '';
        }
      });
    }
  
    updateModeUI();
    renderIcons();
  });