// =============================================================
// CONFIGURATION
// Replace the URL below with your own published Google Sheet CSV link
// =============================================================
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTRopMKgYBI--xMybsFJ6XzxzSYt44-sL_9JUAk3N0MAIVUDxh1z2UTiRTrI6rT2fJuXVKhLU0sSRvr/pub?output=csv';

// Global Three.js variables
let camera, scene, renderer, controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [], pyramid: [] };
let isInitialized = false;

// =============================================================
// 1. Google Authentication & Login Handlers
// =============================================================

function handleCredentialResponse(response) {
    // Decode Google JWT credential token
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const payload = JSON.parse(jsonPayload);
        showVisualization(payload.name, payload.picture);
    } catch (e) {
        console.warn('Could not parse Google credential:', e);
        showVisualization('Authenticated User', null);
    }
}


function showVisualization(userName, userPicture) {
    // Hide login screen and display 3D visualization container
    document.getElementById('login-container').style.display = 'none';
    document.getElementById('visualization-container').style.display = 'block';

    // Update user display info in top-bar
    const nameEl = document.getElementById('user-name');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.textContent = userName || 'User';
    if (avatarEl && userPicture) {
        avatarEl.src = userPicture;
        avatarEl.style.display = 'inline-block';
    } else if (avatarEl) {
        avatarEl.style.display = 'none';
    }

    // Initialize 3D scene only once
    if (!isInitialized) {
        initThreeJS();
        isInitialized = true;
    }
}

function logout() {
    document.getElementById('visualization-container').style.display = 'none';
    document.getElementById('login-container').style.display = 'flex';
}

// =============================================================
// 2. Data Fetching & CSV Parser
// =============================================================

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const data = [];
    // Start from line 1 to skip CSV header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quoted fields containing commas
        const row = [];
        let inQuotes = false;
        let currentValue = '';

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        row.push(currentValue.trim());

        if (row.length >= 6) {
            const name = row[0];
            const photo = row[1];
            const age = row[2];
            const country = row[3];
            const interest = row[4];
            const netWorthRaw = row[5];

            // Extract numeric value from e.g. "$251,260.80" -> 251260.80
            const netWorthNumber = parseFloat(netWorthRaw.replace(/[^0-9.-]+/g, '')) || 0;

            data.push({
                name,
                photo,
                age,
                country,
                interest,
                netWorthRaw,
                netWorthNumber
            });
        }
    }
    return data;
}

async function fetchSheetData() {
    // Normalize Google Sheet URL to ensure it requests CSV format even if /pubhtml was pasted
    let csvUrl = GOOGLE_SHEET_CSV_URL.trim();
    if (csvUrl.endsWith('/pubhtml')) {
        csvUrl = csvUrl.replace(/\/pubhtml$/, '/pub?output=csv');
    } else if (csvUrl.includes('/pub') && !csvUrl.includes('output=csv')) {
        csvUrl = csvUrl.replace(/\/pub(\?.*)?$/, '/pub?output=csv');
    }

    // 1. Attempt to fetch from live published Google Sheet (with cache buster)
    try {
        const cacheBuster = (csvUrl.includes('?') ? '&' : '?') + '_nocache=' + Date.now();
        const response = await fetch(csvUrl + cacheBuster, { cache: 'no-store' });
        if (response.ok) {
            const csvText = await response.text();
            const parsed = parseCSV(csvText);
            if (parsed.length > 0) return parsed;
        }
    } catch (err) {
        console.warn('Could not fetch from published Google Sheet, trying local CSV fallback:', err);
    }

    // 2. Fallback to local Data Template.csv if needed
    try {
        const localResponse = await fetch('Data Template.csv');
        const localText = await localResponse.text();
        return parseCSV(localText);
    } catch (e) {
        console.error('Failed to load local CSV fallback:', e);
        return [];
    }
}

// =============================================================
// 3. Tile Color Coding Based on Net Worth (Requirement 5)
// =============================================================

function getTileStyles(netWorth) {
    if (netWorth < 100000) {
        // Red: #EF3022
        return {
            border: '1.5px solid #EF3022',
            boxShadow: '0 0 10px rgba(239, 48, 34, 0.8)',
            background: 'rgba(239, 48, 34, 0.22)'
        };
    } else if (netWorth <= 200000) {
        // Orange / Yellow: #FDCA35
        return {
            border: '1.5px solid #FDCA35',
            boxShadow: '0 0 10px rgba(253, 202, 53, 0.8)',
            background: 'rgba(253, 202, 53, 0.22)'
        };
    } else {
        // Green: #3A9F48
        return {
            border: '1.5px solid #3A9F48',
            boxShadow: '0 0 10px rgba(58, 159, 72, 0.8)',
            background: 'rgba(58, 159, 72, 0.22)'
        };
    }
}

// Get initials for fallback avatar
function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// =============================================================
// 4. Three.js Initialization & 3D Objects Setup
// =============================================================

async function initThreeJS() {
    const container = document.getElementById('container');

    // Camera setup
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;

    scene = new THREE.Scene();

    // Fetch data from Google Sheet
    const items = await fetchSheetData();
    console.log(`Loaded ${items.length} items from Google Sheet / CSV.`);

    // Create 3D CSS Objects for each data row (Image B format)
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        const element = document.createElement('div');
        element.className = 'element';
        
        // Apply Net Worth tier styling (glow border & tint)
        const style = getTileStyles(item.netWorthNumber);
        element.style.border = style.border;
        element.style.boxShadow = style.boxShadow;
        element.style.backgroundColor = style.background;

        // Header Row: Country (Top Left) & Age (Top Right)
        const headerRow = document.createElement('div');
        headerRow.className = 'header-row';
        
        const countryEl = document.createElement('span');
        countryEl.className = 'country';
        countryEl.textContent = item.country;
        
        const ageEl = document.createElement('span');
        ageEl.className = 'age';
        ageEl.textContent = item.age;
        
        headerRow.appendChild(countryEl);
        headerRow.appendChild(ageEl);
        element.appendChild(headerRow);

        // Photo (Square) with fallback initials
        const photoWrap = document.createElement('div');
        photoWrap.className = 'photo-wrap';

        const img = document.createElement('img');
        img.src = item.photo;
        img.alt = item.name;
        img.onerror = function () {
            this.style.display = 'none';
            const initialsSpan = document.createElement('span');
            initialsSpan.className = 'initials';
            initialsSpan.textContent = getInitials(item.name);
            photoWrap.appendChild(initialsSpan);
        };
        photoWrap.appendChild(img);
        element.appendChild(photoWrap);

        // Name (Bold)
        const nameEl = document.createElement('div');
        nameEl.className = 'name';
        nameEl.textContent = item.name;
        element.appendChild(nameEl);

        // Interest (Subtitle)
        const interestEl = document.createElement('div');
        interestEl.className = 'interest';
        interestEl.textContent = item.interest;
        element.appendChild(interestEl);

        // Create Three.js CSS3DObject
        const objectCSS = new THREE.CSS3DObject(element);
        objectCSS.position.x = Math.random() * 4000 - 2000;
        objectCSS.position.y = Math.random() * 4000 - 2000;
        objectCSS.position.z = Math.random() * 4000 - 2000;
        scene.add(objectCSS);
        objects.push(objectCSS);
    }

    // =============================================================
    // 5. Layout Targets Setup
    // =============================================================

    // 1. TABLE Arrangement: 20 columns x 10 rows (Requirement 7)
    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();
        const col = i % 20;
        const row = Math.floor(i / 20);

        object.position.x = (col * 160) - 1520;
        object.position.y = -(row * 200) + 900;
        object.position.z = 0;

        targets.table.push(object);
    }

    // 2. SPHERE Arrangement (Requirement 6)
    const vectorSphere = new THREE.Vector3();
    for (let i = 0, l = objects.length; i < l; i++) {
        const phi = Math.acos(-1 + (2 * i) / l);
        const theta = Math.sqrt(l * Math.PI) * phi;

        const object = new THREE.Object3D();
        object.position.setFromSphericalCoords(800, phi, theta);

        vectorSphere.copy(object.position).multiplyScalar(2);
        object.lookAt(vectorSphere);

        targets.sphere.push(object);
    }

    // 3. DOUBLE HELIX Arrangement (Requirement 8)
    const vectorHelix = new THREE.Vector3();
    for (let i = 0, l = objects.length; i < l; i++) {
        // Double helix: 2 strands with PI (180deg) offset
        const strand = i % 2;
        const strandIndex = Math.floor(i / 2);
        const theta = strandIndex * 0.175 + (strand * Math.PI);
        const y = -(strandIndex * 9) + 450;

        const object = new THREE.Object3D();
        object.position.setFromCylindricalCoords(900, theta, y);

        vectorHelix.x = object.position.x * 2;
        vectorHelix.y = object.position.y;
        vectorHelix.z = object.position.z * 2;
        object.lookAt(vectorHelix);

        targets.helix.push(object);
    }

    // 4. GRID Arrangement: 5 x 4 x 10 (Requirement 9, Image C)
    for (let i = 0; i < objects.length; i++) {
        const object = new THREE.Object3D();

        const x = (i % 5);
        const y = (Math.floor(i / 5) % 4);
        const z = Math.floor(i / 20);

        object.position.x = (x * 360) - 720;
        object.position.y = -(y * 360) + 540;
        object.position.z = (z * 600) - 2700;

        targets.grid.push(object);
    }

    // 5. PYRAMID (Tetrahedron) Arrangement: 4-face equilateral triangular pyramid
    const pyramidR = 1500;
    const v0 = new THREE.Vector3(0, pyramidR, 0); // Top Apex
    const yBase = -pyramidR / 3;
    const rBase = pyramidR * (2 * Math.SQRT2 / 3);

    const v1 = new THREE.Vector3(rBase * Math.cos(0), yBase, rBase * Math.sin(0));
    const v2 = new THREE.Vector3(rBase * Math.cos(2 * Math.PI / 3), yBase, rBase * Math.sin(2 * Math.PI / 3));
    const v3 = new THREE.Vector3(rBase * Math.cos(4 * Math.PI / 3), yBase, rBase * Math.sin(4 * Math.PI / 3));

    // 4 triangular faces: 3 side faces + 1 bottom face
    const pyramidFaces = [
        { a: v0, b: v1, c: v2 }, // Front-Right Face
        { a: v0, b: v2, c: v3 }, // Back Face
        { a: v0, b: v3, c: v1 }, // Front-Left Face
        { a: v1, b: v2, c: v3 }  // Bottom Face
    ];

    const faceData = pyramidFaces.map(face => {
        const centroid = new THREE.Vector3()
            .add(face.a).add(face.b).add(face.c)
            .divideScalar(3);

        const normal = centroid.clone().normalize();
        const midBC = new THREE.Vector3().addVectors(face.b, face.c).multiplyScalar(0.5);
        const up = new THREE.Vector3().subVectors(face.a, midBC).normalize();
        const right = new THREE.Vector3().crossVectors(up, normal).normalize();
        const trueUp = new THREE.Vector3().crossVectors(normal, right).normalize();

        const basisMatrix = new THREE.Matrix4();
        basisMatrix.makeBasis(right, trueUp, normal);
        const rotation = new THREE.Euler().setFromRotationMatrix(basisMatrix);

        return {
            a: face.a,
            b: face.b,
            c: face.c,
            rotation: rotation
        };
    });

    const itemsPerFace = Math.ceil(objects.length / 4);

    for (let i = 0; i < objects.length; i++) {
        const faceIndex = Math.min(Math.floor(i / itemsPerFace), 3);
        const fData = faceData[faceIndex];

        const indexOnFace = i - faceIndex * itemsPerFace;
        const itemsOnThisFace = (faceIndex === 3) ? (objects.length - 3 * itemsPerFace) : itemsPerFace;

        // Number of triangular rows needed for this face
        const K = Math.max(1, Math.ceil((Math.sqrt(1 + 8 * itemsOnThisFace) - 1) / 2));
        
        // Row and column of element within the triangular face lattice
        const r = Math.floor((Math.sqrt(1 + 8 * indexOnFace) - 1) / 2);
        const c = indexOnFace - (r * (r + 1)) / 2;

        const v = (r + 0.6) / (K + 0.2);
        const u = (c + 0.5) / (r + 1);

        const pos = new THREE.Vector3()
            .copy(fData.a)
            .multiplyScalar(1 - v)
            .add(
                new THREE.Vector3()
                    .copy(fData.b)
                    .multiplyScalar((1 - u) * v)
            )
            .add(
                new THREE.Vector3()
                    .copy(fData.c)
                    .multiplyScalar(u * v)
            );

        const object = new THREE.Object3D();
        object.position.copy(pos);
        object.rotation.copy(fData.rotation);

        targets.pyramid.push(object);
    }

    // =============================================================
    // 6. Renderer & Trackball Controls Setup
    // =============================================================

    renderer = new THREE.CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    controls = new THREE.TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    // Button event listeners
    setupButtonListener('table', targets.table);
    setupButtonListener('sphere', targets.sphere);
    setupButtonListener('helix', targets.helix);
    setupButtonListener('grid', targets.grid);
    setupButtonListener('pyramid', targets.pyramid);

    // Initial transition into Table view
    transform(targets.table, 2000);
    setActiveButton('table');

    window.addEventListener('resize', onWindowResize);

    animate();
}

function setupButtonListener(buttonId, targetLayout) {
    const button = document.getElementById(buttonId);
    if (!button) return;
    button.addEventListener('click', function () {
        transform(targetLayout, 2000);
        setActiveButton(buttonId);
    });
}

function setActiveButton(buttonId) {
    const buttons = ['table', 'sphere', 'helix', 'grid', 'pyramid'];
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === buttonId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });
}

// =============================================================
// 7. Animations & Transformations (TWEEN)
// =============================================================

function transform(targetsArray, duration) {
    TWEEN.removeAll();

    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targetsArray[i];

        if (!target) continue;

        new TWEEN.Tween(object.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

        new TWEEN.Tween(object.rotation)
            .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    }

    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}