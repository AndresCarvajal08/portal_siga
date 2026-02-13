// SIGA - Script de Interactividad

const DRIVE_API_KEY = 'AIzaSyCyl7ILczVwmLrCW8BP_Mk0ZzKSyKoRkiI';
const DRIVE_TEMPLATES_PARENT_FOLDER_ID = '1LbT3KrLOBv3tKUtyW3dSzJyZMbo2ZX4a';
const DRIVE_FIELDS = 'files(id,name,mimeType)';


// Filtrar procesos por búsqueda
function filterProcesses() {
  const searchInput = document.getElementById('searchInput');
  const processList = document.getElementById('processList');
  const searchTerm = searchInput.value.toLowerCase();
  
  const processCards = processList.querySelectorAll('.process-card');
  
  processCards.forEach(card => {
    const cardText = card.getAttribute('data-name').toLowerCase();
    const isVisible = cardText.includes(searchTerm);
    card.style.display = isVisible ? '' : 'none';
  });
}

// Toggle para expandir/contraer archivos de proceso
function toggleFiles(element) {
  const processCard = element.closest('.process-card');
  processCard.classList.toggle('expanded');
}

// Abrir modal de documentos
function openDocumentModal(processName, documentsData) {
  const modal = document.getElementById('documentModal');
  const modalTitle = document.getElementById('modalTitle');
  const documentList = document.getElementById('documentList');
  
  modalTitle.textContent = `Documentos: ${processName}`;
  documentList.innerHTML = '';
  
  documentsData.forEach(doc => {
    const docItem = document.createElement('div');
    docItem.className = 'document-item';
    docItem.innerHTML = `
      <div class="document-icon">📄</div>
      <div class="document-name">${doc.name}</div>
      <div class="document-action">${doc.type}</div>
      <button class="document-btn" onclick="openDocument('${doc.link}')">Inspeccionar</button>
    `;
    documentList.appendChild(docItem);
  });
  
  modal.classList.add('active');
}

// Cerrar modal
function closeDocumentModal() {
  const modal = document.getElementById('documentModal');
  modal.classList.remove('active');
}

// Abrir documento (conectar con Google Drive)
function openDocument(link) {
  window.open(link, '_blank');
}

function getTemplateIconLabel(fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  const map = {
    'pptx': 'PP',
    'ppt': 'PP',
    'docx': 'DO',
    'doc': 'DO',
    'xlsx': 'EX',
    'xls': 'EX',
    'pdf': 'PDF'
  };

  return map[extension] || extension.slice(0, 2).toUpperCase();
}

function buildTemplateCard(folder) {
  const card = document.createElement('div');
  card.className = 'template-item';

  const folderName = folder.name;
  const folderId = folder.id;

  card.innerHTML = `
    <div class="template-icon-large">📁</div>
    <h3>${folderName}</h3>
    <p>Plantillas y documentos disponibles.</p>
    <div style="display:flex; gap:0.6rem; justify-content:center; flex-wrap:wrap;">
      <button class="template-download" onclick="openTemplateModal('${folderId}', '${folderName}')">Documentos</button>
    </div>
  `;

  return card;
}

async function loadFolderContents(folderId, folderName, breadcrumb = []) {
  console.log(`Cargando contenido de carpeta: ${folderName} (${folderId})`);
  
  const modalContent = document.getElementById('templateModalContent');
  if (!modalContent) return;

  try {
    // Buscar tanto carpetas como archivos
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fieldsStr = encodeURIComponent('files(id,name,mimeType)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fieldsStr}&orderBy=name&key=${DRIVE_API_KEY}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error al cargar contenido: ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.files) ? data.files : [];
    
    // Separar carpetas de archivos
    const folders = items.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
    const files = items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');

    console.log(`Carpetas: ${folders.length}, Archivos: ${files.length}`);

    // Construir breadcrumb
    let breadcrumbHtml = '<div style="margin-bottom: 1rem; font-size: 0.9rem;">';
    breadcrumbHtml += '<button style="background:none; border:none; color:#0066cc; cursor:pointer; text-decoration:underline;" onclick="openTemplateModal(\'' + (breadcrumb.length > 0 ? breadcrumb[breadcrumb.length - 1].id : '') + '\', \'Volver\')">← Volver</button>';
    breadcrumbHtml += ' &gt; ' + folderName;
    breadcrumbHtml += '</div>';

    // Construir contenido
    let contentHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:1rem;">';

    // Mostrar carpetas
    folders.forEach(folder => {
      contentHtml += `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; text-align: center; cursor: pointer; transition: all 0.3s;" onclick="loadFolderContents('${folder.id}', '${folder.name}')" onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📁</div>
          <div style="font-weight: bold; word-break: break-word;">${folder.name}</div>
          <div style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">Carpeta</div>
        </div>
      `;
    });

    // Mostrar archivos
    files.forEach(file => {
      const iconLabel = getTemplateIconLabel(file.name);
      const displayName = file.name.replace(/\.[^/.]+$/, '');
      const viewLink = `https://drive.google.com/file/d/${file.id}/preview`;
      const downloadLink = `https://drive.google.com/uc?export=download&id=${file.id}`;

      contentHtml += `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem; font-weight: bold; color: #0066cc;">${iconLabel}</div>
          <div style="font-weight: bold; word-break: break-word; margin-bottom: 0.5rem; font-size: 0.9rem;">${displayName}</div>
          <div style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
            <a href="${viewLink}" target="_blank" rel="noopener" style="padding: 0.5rem 0.8rem; background-color: #0066cc; color: white; border-radius: 4px; text-decoration: none; font-size: 0.85rem; cursor: pointer;">Ver</a>
            <a href="${downloadLink}" target="_blank" rel="noopener" style="padding: 0.5rem 0.8rem; background-color: #666; color: white; border-radius: 4px; text-decoration: none; font-size: 0.85rem; cursor: pointer;">Descargar</a>
          </div>
        </div>
      `;
    });

    contentHtml += '</div>';

    // Mostrar mensaje si está vacío
    if (items.length === 0) {
      contentHtml = '<div style="text-align: center; padding: 2rem; color: #666;">Esta carpeta está vacía</div>';
    }

    modalContent.innerHTML = breadcrumbHtml + contentHtml;

  } catch (error) {
    console.error('Error al cargar contenido:', error);
    modalContent.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
  }
}

function openTemplateModal(folderId, folderName) {
  console.log(`Abriendo modal para: ${folderName} (${folderId})`);
  
  const modal = document.getElementById('templateListModal');
  if (!modal) {
    console.error('Modal no encontrado');
    return;
  }

  const modalTitle = document.getElementById('templateModalTitle');
  if (modalTitle) {
    modalTitle.textContent = folderName;
  }

  modal.classList.add('active');
  loadFolderContents(folderId, folderName);
}

function closeTemplateModal() {
  const modal = document.getElementById('templateListModal');
  if (modal) {
    modal.classList.remove('active');
  }
}

async function loadTemplatesFromDrive() {
  const templatesList = document.getElementById('templatesList');
  if (!templatesList) {
    return;
  }

  try {
    console.log('=== INICIANDO CARGA DE CARPETAS DE PLANTILLAS ===');
    console.log('Carpeta padre ID:', DRIVE_TEMPLATES_PARENT_FOLDER_ID);
    
    // Obtener las 8 subcarpetas dentro de plantillas
    const foldersQuery = encodeURIComponent(`'${DRIVE_TEMPLATES_PARENT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const foldersUrl = `https://www.googleapis.com/drive/v3/files?q=${foldersQuery}&fields=files(id,name)&orderBy=name&key=${DRIVE_API_KEY}`;
    
    console.log('Buscando carpetas en:', foldersUrl);
    const foldersResponse = await fetch(foldersUrl);
    
    if (!foldersResponse.ok) {
      throw new Error(`Error al obtener carpetas: ${foldersResponse.status}`);
    }

    const foldersData = await foldersResponse.json();
    const folders = Array.isArray(foldersData.files) ? foldersData.files : [];
    console.log('Carpetas encontradas:', folders.length);
    console.log('Lista de carpetas:', folders.map(f => f.name));

    if (folders.length === 0) {
      console.warn('No hay carpetas');
      templatesList.innerHTML = `
        <div class="template-item">
          <div class="template-icon-large">!</div>
          <h3>Sin carpetas</h3>
          <p>No se encontraron carpetas de plantillas.</p>
        </div>
      `;
      return;
    }

    console.log('Renderizando', folders.length, 'carpetas...');
    templatesList.innerHTML = '';
    folders.forEach(folder => templatesList.appendChild(buildTemplateCard(folder)));
    console.log('Carpetas de plantillas cargadas exitosamente');
  } catch (error) {
    console.error('=== ERROR COMPLETO ===');
    console.error('Mensaje:', error.message);
    console.error('Stack:', error.stack);
    templatesList.innerHTML = `
      <div class="template-item">
        <div class="template-icon-large">!</div>
        <h3>Error al cargar</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}


// Buscar cuando se presiona Enter
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        filterProcesses();
      }
    });
  }
  
  // Cerrar modal de documentos al hacer click fuera
  const documentModal = document.getElementById('documentModal');
  if (documentModal) {
    window.addEventListener('click', function(event) {
      if (event.target === documentModal) {
        closeDocumentModal();
      }
    });
  }

  // Cerrar modal de plantillas al hacer click fuera
  const templateListModal = document.getElementById('templateListModal');
  if (templateListModal) {
    window.addEventListener('click', function(event) {
      if (event.target === templateListModal) {
        closeTemplateModal();
      }
    });
  }

  loadTemplatesFromDrive();

});

