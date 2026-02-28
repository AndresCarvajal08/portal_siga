// SIGA - Script de Interactividad

const DRIVE_API_KEY = 'AIzaSyCyl7ILczVwmLrCW8BP_Mk0ZzKSyKoRkiI';
const DRIVE_TEMPLATES_PARENT_FOLDER_ID = '1LbT3KrLOBv3tKUtyW3dSzJyZMbo2ZX4a';
const DRIVE_PROCESSES_FOLDER_ID = '1ByhyKsQw67AJtTqcTqznHIJI9NZkUil_';
const DRIVE_FIELDS = 'files(id,name,mimeType)';

// Variables globales para manejar el historial de navegación
let navigationHistory = [];
let currentProcessCode = ''; // Variable para almacenar el código del proceso actual


// Filtrar procesos por búsqueda
function filterProcesses() {
  const searchInput = document.getElementById('searchInput');
  const processList = document.getElementById('processList');
  const searchTerm = searchInput.value.toLowerCase();
  
  const processCards = processList.querySelectorAll('.process-card');
  
  processCards.forEach(card => {
    const cardName = card.getAttribute('data-name').toLowerCase();
    const processCodeElement = card.querySelector('.process-code');
    const processCode = processCodeElement ? processCodeElement.textContent.toLowerCase() : '';
    
    // Buscar en nombre o en siglas
    const isVisible = cardName.includes(searchTerm) || processCode.includes(searchTerm);
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
  
  modalTitle.textContent = `Listado Maestro de Documentos ${processName}`;
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

// Abrir vista previa de documento en modal con iframe
function openDocumentViewer(viewLink, documentName) {
  const modal = document.getElementById('documentViewerModal');
  const viewerTitle = document.getElementById('viewerTitle');
  const viewerFrame = document.getElementById('documentViewerFrame');
  
  if (modal && viewerTitle && viewerFrame) {
    viewerTitle.textContent = documentName;
    viewerFrame.src = viewLink;
    modal.classList.add('active');
  }
}

// Cerrar vista previa de documento
function closeDocumentViewer() {
  const modal = document.getElementById('documentViewerModal');
  const viewerFrame = document.getElementById('documentViewerFrame');
  
  if (modal && viewerFrame) {
    modal.classList.remove('active');
    // Limpiar el iframe al cerrar
    viewerFrame.src = '';
  }
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

async function loadFolderContents(folderId, folderName, isProcessFolder = true, isBackNavigation = false) {
  console.log(`Cargando contenido de carpeta: ${folderName} (${folderId}), isProcess: ${isProcessFolder}`);
  
  // Determinar qué elemento usar según el contexto
  let modalContent = null;
  if (isProcessFolder) {
    modalContent = document.getElementById('documentList');
  } else {
    modalContent = document.getElementById('templateModalContent');
  }
  
  if (!modalContent) {
    console.error(' Error: Modal content no encontrado');
    return;
  }
  
  // Manejar historial de navegación
  if (!isBackNavigation) {
    // Solo agregar al historial si no estamos retrocediendo
    navigationHistory.push({id: folderId, name: folderName, isProcessFolder: isProcessFolder});
  }

  try {
    // Buscar tanto carpetas como archivos
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fieldsStr = encodeURIComponent('files(id,name,mimeType)');
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fieldsStr}&orderBy=name&key=${DRIVE_API_KEY}`;
    
    console.log('Fetching URL:', url.substring(0, 100) + '...');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error al cargar contenido: ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data.files) ? data.files : [];
    
    // Separar carpetas de archivos
    const folders = items.filter(item => item.mimeType === 'application/vnd.google-apps.folder');
    const files = items.filter(item => item.mimeType !== 'application/vnd.google-apps.folder');

    console.log(`✓ Carpetas: ${folders.length}, Archivos: ${files.length}`);

    // Construir breadcrumb
    let breadcrumbHtml = '<div style="margin-bottom: 1rem; font-size: 0.9rem;">';
    
    // Lógica de navegación unificada
    if (navigationHistory.length > 1) {
      // Si hay más de 1 elemento en el historial, puedo retroceder
      breadcrumbHtml += '<button style="background:none; border:none; color:#0066cc; cursor:pointer; text-decoration:underline;" onclick="goBackFolder()">← Volver</button>';
    } else {
      // Si no hay historial, cerrar la modal
      if (isProcessFolder) {
        breadcrumbHtml += '<button style="background:none; border:none; color:#0066cc; cursor:pointer; text-decoration:underline;" onclick="closeDocumentModal()">← Volver</button>';
      } else {
        breadcrumbHtml += '<button style="background:none; border:none; color:#0066cc; cursor:pointer; text-decoration:underline;" onclick="closeTemplateModal()">← Volver</button>';
      }
    }
    breadcrumbHtml += ' &gt; ' + folderName;
    breadcrumbHtml += '</div>';

    // Construir contenido
    let contentHtml = '<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:1rem;">';

    // Mostrar carpetas
    folders.forEach((folder, index) => {
      contentHtml += `
        <div class="folder-item" data-folder-index="${index}" data-is-process="${isProcessFolder}" style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; text-align: center; cursor: pointer; transition: all 0.3s;" onmouseover="this.style.boxShadow='0 4px 8px rgba(0,0,0,0.1)'" onmouseout="this.style.boxShadow='none'">
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
      const viewLink = `https://drive.google.com/file/d/${file.id}/preview?rm=minimal`;
      const downloadLink = `https://drive.google.com/uc?export=download&id=${file.id}`;
      
      // Determinar si mostrar botón de descargar
      // Plantillas (isProcessFolder=false): siempre permiten descargar
      // Procesos (isProcessFolder=true): solo si la carpeta es "Formatos (FT)"
      const canDownload = !isProcessFolder || folderName.includes('(FT)');
      const downloadButton = canDownload
        ? `<a href="${downloadLink}" target="_blank" rel="noopener" style="padding: 0.5rem 0.8rem; background-color: #666; color: white; border-radius: 4px; text-decoration: none; font-size: 0.85rem; cursor: pointer;">Descargar</a>`
        : '';

      contentHtml += `
        <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem; font-weight: bold; color: #0066cc;">${iconLabel}</div>
          <div style="font-weight: bold; word-break: break-word; margin-bottom: 0.5rem; font-size: 0.9rem;">${displayName}</div>
          <div style="display:flex; gap:0.5rem; justify-content:center; flex-wrap:wrap;">
            <button onclick="openDocumentViewer('${viewLink}', '${displayName.replace(/'/g, "\\'")}');" style="padding: 0.5rem 0.8rem; background-color: #0066cc; color: white; border: none; border-radius: 4px; font-size: 0.85rem; cursor: pointer;">Ver</button>
            ${downloadButton}
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

    // Agregar event listeners a las carpetas
    const folderItems = modalContent.querySelectorAll('.folder-item');
    folderItems.forEach((item, index) => {
      item.addEventListener('click', function() {
        const isProcess = this.getAttribute('data-is-process') === 'true';
        const folder = folders[index];
        if (folder) {
          console.log('Navegando a carpeta:', folder.name, folder.id);
          loadFolderContents(folder.id, folder.name, isProcess);
        }
      });
    });

  } catch (error) {
    console.error('Error al cargar contenido:', error);
    modalContent.innerHTML = `<div style="color: red;">Error: ${error.message}</div>`;
  }
}

function openTemplateModal(folderId, folderName) {
  console.log(`Abriendo modal para: ${folderName} (${folderId})`);
  
  // Resetear historial de navegación al abrir una nueva carpeta principal
  navigationHistory = [];
  
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
  loadFolderContents(folderId, folderName, false);
}

function goBackFolder() {
  // Remover la carpeta actual del historial
  if (navigationHistory.length > 1) {
    navigationHistory.pop(); // Remover actual
    const previousFolder = navigationHistory[navigationHistory.length - 1];
    // No remover de nuevo, loadFolderContents se encargará con isBackNavigation
    loadFolderContents(previousFolder.id, previousFolder.name, previousFolder.isProcessFolder, true);
  } else if (navigationHistory.length === 1) {
    // Si solo hay 1 elemento, cerrar la modal según el tipo
    const lastFolder = navigationHistory[0];
    if (lastFolder.isProcessFolder) {
      closeDocumentModal();
    } else {
      closeTemplateModal();
    }
  }
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


async function loadProcessesFromDrive() {
  const processList = document.getElementById('processList');
  if (!processList) {
    console.error(' processList no encontrado');
    return;
  }

  try {
    console.log(' Iniciando carga de procesos desde Drive...');
    console.log(' Folder ID:', DRIVE_PROCESSES_FOLDER_ID);
    
    // Obtener las subcarpetas de procesos
    const foldersQuery = encodeURIComponent(`'${DRIVE_PROCESSES_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const foldersUrl = `https://www.googleapis.com/drive/v3/files?q=${foldersQuery}&fields=files(id,name)&orderBy=name&key=${DRIVE_API_KEY}`;
    
    console.log(' Llamando API...');
    const foldersResponse = await fetch(foldersUrl);
    
    if (!foldersResponse.ok) {
      const errorData = await foldersResponse.json();
      console.error(' Error en API:', errorData);
      console.error('Status:', foldersResponse.status);
      console.error(' PROBLEMA: La carpeta o sus subcarpetas no están compartidas públicamente');
      console.error(' Solución: Comparte la carpeta Procesos Y todas sus subcarpetas con "Cualquiera con el enlace"');
      return;
    }

    const foldersData = await foldersResponse.json();
    const processes = Array.isArray(foldersData.files) ? foldersData.files : [];
    
    console.log('✓ Procesos encontrados:', processes.length);
    processes.forEach((p, i) => console.log(`  ${i + 1}. ${p.name} (${p.id})`));
    
    if (processes.length === 0) {
      return;
    }

    // Obtener documentos de cada proceso en paralelo
    const processPromises = processes.map(async (process) => {
      // Buscar TODOS los archivos (incluyendo en subcarpetas)
      const docsQuery = encodeURIComponent(`'${process.id}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`);
      const docsUrl = `https://www.googleapis.com/drive/v3/files?q=${docsQuery}&fields=files(id,name)&pageSize=1000&key=${DRIVE_API_KEY}`;
      
      try {
        const docsResponse = await fetch(docsUrl);
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          let documents = Array.isArray(docsData.files) ? docsData.files : [];
          
          // Si no hay archivos directos, buscar en subcarpetas
          if (documents.length === 0) {
            console.log(`   ${process.name}: Sin archivos directos, buscando en subcarpetas...`);
            
            // Obtener subcarpetas
            const subFoldersQuery = encodeURIComponent(`'${process.id}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`);
            const subFoldersUrl = `https://www.googleapis.com/drive/v3/files?q=${subFoldersQuery}&fields=files(id,name)&pageSize=1000&key=${DRIVE_API_KEY}`;
            
            const subFoldersResponse = await fetch(subFoldersUrl);
            if (subFoldersResponse.ok) {
              const subFoldersData = await subFoldersResponse.json();
              const subFolders = Array.isArray(subFoldersData.files) ? subFoldersData.files : [];
              
              // Buscar archivos en cada subcarpeta
              for (const subFolder of subFolders) {
                const subDocsQuery = encodeURIComponent(`'${subFolder.id}' in parents and mimeType!='application/vnd.google-apps.folder' and trashed=false`);
                const subDocsUrl = `https://www.googleapis.com/drive/v3/files?q=${subDocsQuery}&fields=files(id,name)&pageSize=1000&key=${DRIVE_API_KEY}`;
                
                try {
                  const subDocsResponse = await fetch(subDocsUrl);
                  if (subDocsResponse.ok) {
                    const subDocsData = await subDocsResponse.json();
                    const subDocuments = Array.isArray(subDocsData.files) ? subDocsData.files : [];
                    documents = [...documents, ...subDocuments];
                  }
                } catch (e) {
                  console.warn(`Error al buscar en subcarpeta ${subFolder.name}:`, e);
                }
              }
            }
          }
          
          console.log(`  ✓ ${process.name}: ${documents.length} archivos encontrados`);
          return { ...process, documents };
        }
      } catch (e) {
        console.warn(`Error al cargar documentos del proceso ${process.name}:`, e);
      }
      return { ...process, documents: [] };
    });

    const processesWithDocs = await Promise.all(processPromises);

    // Reemplazar tarjetas existentes manteniendo el diseño
    const processCards = processList.querySelectorAll('.process-card');
    
    processesWithDocs.forEach((process, index) => {
      let card;
      
      if (processCards[index]) {
        // Actualizar tarjeta existente
        card = processCards[index];
      } else {
        // Crear nueva tarjeta si no existe
        card = document.createElement('div');
        card.className = 'process-card';
        card.innerHTML = `
          <div class="process-header">
            <div class="process-number">${index + 1}</div>
            <div class="process-info">
              <div class="process-name"></div>
              <span class="process-code"></span>
              <div class="process-leader">Liderado por: <strong>Dirección</strong></div>
            </div>
          </div>
          <div class="process-files">
            <button class="file-chip"><span class="file-icon">📋</span>Documentos</button>
          </div>
        `;
        processList.appendChild(card);
      }
      
      // Parsear nombre: "Nombre del Proceso (SIGLAS)"
      const match = process.name.match(/^(.+?)\s*\(([A-Z0-9]+)\)$/);
      let processName = process.name;
      let processCode = '';
      
      if (match) {
        processName = match[1].trim();
        processCode = match[2];
      }
      
      // Actualizar número del proceso
      const processNumber = card.querySelector('.process-number');
      if (processNumber) {
        processNumber.textContent = index + 1;
      }
      
      // Actualizar nombre del proceso
      const processNameElement = card.querySelector('.process-name');
      if (processNameElement) {
        processNameElement.textContent = processName;
        card.setAttribute('data-name', processName);
      }
      
      // Actualizar código del proceso
      const processCodeElement = card.querySelector('.process-code');
      if (processCodeElement && processCode) {
        processCodeElement.textContent = processCode;
      }

      // Actualizar botón con documentos - pasar el ID de la carpeta
      const fileChip = card.querySelector('.file-chip');
      if (fileChip) {
        console.log(`📌 Configurando onclick para: ${processName}`);
        fileChip.onclick = function(event) {
          console.log('🔴 CLICK EN BOTON:', processName, process.id);
          event.preventDefault();
          event.stopPropagation();
          openProcessFolderModal(processName, process.id);
        };
        console.log(`✓ Botón asignado para: ${processName} (carpeta: ${process.id})`);
      }
    });

    // Eliminar tarjetas sobrantes
    if (processCards.length > processesWithDocs.length) {
      for (let i = processesWithDocs.length; i < processCards.length; i++) {
        processCards[i].remove();
      }
    }

    // Actualizar contador de procesos
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
      sectionTitle.textContent = `${processesWithDocs.length} Procesos Institucionales`;
    }

    console.log('✅ Procesos cargados desde Drive:', processesWithDocs.length);
  } catch (error) {
    console.error('Error al cargar procesos:', error);
  }
}

function openProcessFolderModal(processName, folderId) {
  console.log(`📂 ABRIENDO MODAL - Proceso: ${processName}, ID: ${folderId}`);
  
  // Resetear historial de navegación
  navigationHistory = [];
  
  // Extraer código del proceso: "Nombre (CODIGO)" -> "CODIGO"
  const match = processName.match(/\(([A-Z0-9]+)\)$/);
  currentProcessCode = match ? match[1] : '';
  console.log(`✓ Código de proceso extraído: ${currentProcessCode}`);
  
  const modal = document.getElementById('documentModal');
  console.log('✓ Modal encontrado:', !!modal);
  
  if (!modal) {
    console.error('❌ Modal no encontrado');
    return;
  }

  // Mostrar el modal
  modal.classList.add('active');
  console.log('✓ Modal clase "active" agregada');
  
  // Actualizar título
  const modalTitle = document.getElementById('modalTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  if (modalTitle) {
    modalTitle.textContent = `Listado Maestro de Documentos`;
    console.log('✓ Título actualizado:', processName);
  }
  if (modalSubtitle) {
    modalSubtitle.textContent = processName;
  }
  
  // Cargar el contenido de la carpeta
  console.log('✓ Llamando loadFolderContents...');
  loadFolderContents(folderId, processName, true, false);
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

  // Cerrar modal de vista previa al hacer click fuera
  const documentViewerModal = document.getElementById('documentViewerModal');
  if (documentViewerModal) {
    window.addEventListener('click', function(event) {
      if (event.target === documentViewerModal) {
        closeDocumentViewer();
      }
    });
  }

  // Cargar procesos desde Drive
  console.log('=== INICIANDO SIGA ===');
  console.log('API Key:', DRIVE_API_KEY.substring(0, 10) + '...');
  console.log('Procesos Folder ID:', DRIVE_PROCESSES_FOLDER_ID);
  console.log('Plantillas Folder ID:', DRIVE_TEMPLATES_PARENT_FOLDER_ID);
  
  loadProcessesFromDrive();
  
  // Cargar plantillas si existe templates.html
  loadTemplatesFromDrive();

});

