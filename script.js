/* Solar System Simulation - Master Class Implementation
   Removed ES module import of THREE to use global THREE from CDN */

class SolarSystemSimulation {
  constructor() {
    this.scene = null
    this.camera = null
    this.renderer = null
    this.controls = null

    // Animation properties
    this.animationSpeed = 1
    this.planetScale = 1
    this.isPlaying = true
    this.clock = new THREE.Clock()

    // Solar system objects
    this.sun = null
    this.planets = []
    this.planetData = {}
    this.stars = null
    this.orbits = [] // Store orbit lines

    // UI elements
    this.loadingScreen = document.getElementById("loading-screen")
    this.speedSlider = document.getElementById("speed-slider")
    this.scaleSlider = document.getElementById("scale-slider")
    this.playPauseBtn = document.getElementById("play-pause-btn")
    this.resetBtn = document.getElementById("reset-btn")
    this.fullscreenBtn = document.getElementById("fullscreen-btn")
    this.planetSelect = document.getElementById("planet-select")
    this.planetInfo = document.getElementById("planet-info")

    // Performance monitoring
    this.frameCount = 0
    this.lastTime = performance.now()
    this.fps = 60

    // Individual planet speed multipliers
    this.planetSpeedMultipliers = {
      mercury: 1.0,
      venus: 1.0,
      earth: 1.0,
      mars: 1.0,
      jupiter: 1.0,
      saturn: 1.0,
      uranus: 1.0,
      neptune: 1.0,
    }

    // Bonus features
    this.isDarkMode = true
    this.planetTooltip = document.getElementById("planet-tooltip")
    this.isZooming = false
    this.hoveredPlanet = null
    this.shootingStars = []

    this.init()
  }

  init() {
    this.setupScene()
    this.createStarField()
    this.createSun()
    this.createPlanets()
    this.setupLighting()
    this.setupControls()
    this.setupEventListeners()
    this.hideLoadingScreen()
    this.animate()
  }

  hideLoadingScreen() {
    if (this.loadingScreen) {
      this.loadingScreen.style.opacity = "0"
      setTimeout(() => {
        this.loadingScreen.style.display = "none"
      }, 500)
    }
  }

  setupScene() {
    // Scene setup
    this.scene = new THREE.Scene()

    // Camera setup - using perspective camera for 3D view
    this.camera = new THREE.PerspectiveCamera(
      75, // Field of view
      window.innerWidth / window.innerHeight, // Aspect ratio
      0.1, // Near clipping plane
      10000, // Far clipping plane,
    )
    this.camera.position.set(0, 30, 100) // Position camera for good initial view

    // Renderer setup with enhanced settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true, // Smoother edges
      alpha: true, // Allow transparency
      powerPreference: "high-performance", // Request high performance GPU
    })

    // Make canvas fullscreen
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // Limit for performance

    // Enable shadows for realistic lighting
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Add tone mapping for better color reproduction
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.5

    // Add canvas to container
    document.getElementById("canvas-container").appendChild(this.renderer.domElement)

    // Handle window resizing
    window.addEventListener(
      "resize",
      () => {
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()

        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight)
      },
      false,
    )
  }

  createStarField() {
    // Create a more realistic starry background with varied star sizes and colors

    const starGeometry = new THREE.BufferGeometry()
    const starCount = 15000 // Increased star count for more immersive background

    // Arrays to store star positions and colors
    const positions = new Float32Array(starCount * 3)
    const colors = new Float32Array(starCount * 3)
    const sizes = new Float32Array(starCount)

    for (let i = 0; i < starCount * 3; i += 3) {
      // Create stars in a large sphere around the scene
      const radius = Math.random() * 3000 + 1000 // Stars between 1000 and 4000 units away
      const theta = Math.random() * Math.PI * 2 // Random angle around y-axis
      const phi = Math.acos(Math.random() * 2 - 1) // Random angle from top to bottom

      // Convert spherical to Cartesian coordinates
      positions[i] = radius * Math.sin(phi) * Math.cos(theta) // x
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta) // y
      positions[i + 2] = radius * Math.cos(phi) // z

      // Create varied star colors (white, blue-white, yellow-white)
      const colorChoice = Math.random()
      if (colorChoice < 0.6) {
        // White stars (most common)
        const intensity = Math.random() * 0.2 + 0.8
        colors[i] = intensity
        colors[i + 1] = intensity
        colors[i + 2] = intensity
      } else if (colorChoice < 0.8) {
        // Blue-white stars
        const intensity = Math.random() * 0.2 + 0.8
        colors[i] = intensity * 0.8
        colors[i + 1] = intensity * 0.9
        colors[i + 2] = intensity
      } else {
        // Yellow-white stars
        const intensity = Math.random() * 0.2 + 0.8
        colors[i] = intensity
        colors[i + 1] = intensity * 0.9
        colors[i + 2] = intensity * 0.7
      }

      // Varied star sizes
      sizes[i / 3] = Math.random() * 2 + 0.5
    }

    // Add attributes to geometry
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    starGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    starGeometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))

    // Create shader material for better-looking stars
    const starMaterial = new THREE.PointsMaterial({
      size: 2,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    })

    // Create the star field and add to scene
    this.stars = new THREE.Points(starGeometry, starMaterial)
    this.scene.add(this.stars)

    // Add a subtle blue nebula background
    const textureLoader = new THREE.TextureLoader()
    const galaxyGeometry = new THREE.SphereGeometry(4000, 32, 32)
    const galaxyMaterial = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      color: 0x0a0a30,
      transparent: true,
      opacity: 0.6,
    })

    const galaxy = new THREE.Mesh(galaxyGeometry, galaxyMaterial)
    this.scene.add(galaxy)
  }

  createSun() {
    // Create a large yellow sphere for the sun
    const sunGeometry = new THREE.SphereGeometry(8, 64, 64) // Larger size (8 units radius) with high detail

    // Enhanced sun material with bright yellow color and strong emission
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00, // Bright yellow
      emissive: 0xffdd00, // Strong yellow emission for glow
      emissiveIntensity: 0.8, // High emission intensity
    })

    // Create the sun mesh and position at center
    this.sun = new THREE.Mesh(sunGeometry, sunMaterial)
    this.sun.name = "sun"
    this.sun.position.set(0, 0, 0) // Center of the scene
    this.scene.add(this.sun)

    // Create multiple glow layers for enhanced effect

    // Inner glow layer
    const innerGlowGeometry = new THREE.SphereGeometry(10, 32, 32)
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide, // Render from inside
    })
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial)
    this.sun.add(innerGlow)

    // Outer glow layer
    const outerGlowGeometry = new THREE.SphereGeometry(12, 32, 32)
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
    })
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial)
    this.sun.add(outerGlow)

    // Corona effect (very subtle outer layer)
    const coronaGeometry = new THREE.SphereGeometry(15, 16, 16)
    const coronaMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff88,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    })
    const corona = new THREE.Mesh(coronaGeometry, coronaMaterial)
    this.sun.add(corona)

    // Main point light from the sun - creates realistic lighting
    const sunLight = new THREE.PointLight(0xffffff, 3, 2000, 1) // Increased intensity and range
    sunLight.position.set(0, 0, 0) // At sun's center
    sunLight.castShadow = true

    // Enhanced shadow quality
    sunLight.shadow.mapSize.width = 4096 // Higher resolution shadows
    sunLight.shadow.mapSize.height = 4096
    sunLight.shadow.camera.near = 0.1
    sunLight.shadow.camera.far = 1000
    sunLight.shadow.bias = -0.0001 // Reduce shadow acne

    this.scene.add(sunLight)

    // Additional warm light for atmosphere
    const warmLight = new THREE.PointLight(0xffaa44, 1.5, 1500, 2)
    warmLight.position.set(0, 0, 0)
    this.scene.add(warmLight)

    // Store reference to lights for animation
    this.sunLight = sunLight
    this.warmLight = warmLight
  }

  createPlanets() {
    // Define planet data with Material Design-inspired colors
    this.planetData = {
      mercury: {
        name: "Mercury",
        distance: 20,
        size: 0.38,
        color: 0xcfd8dc,
        speed: 4.15, // Fastest orbit - 88 Earth days
        tilt: 0.034,
        info: {
          distance: "57.9 million km",
          diameter: "4,879 km",
          period: "88 Earth days",
          temperature: "167°C (day), -173°C (night)",
          description:
            "The smallest planet in our solar system and closest to the Sun. Mercury has extreme temperature variations.",
        },
      },
      venus: {
        name: "Venus",
        distance: 30,
        size: 0.95,
        color: 0xffccbc,
        speed: 1.62, // 225 Earth days
        tilt: 3.096,
        info: {
          distance: "108.2 million km",
          diameter: "12,104 km",
          period: "225 Earth days",
          temperature: "462°C",
          description:
            "The hottest planet in our solar system with a thick, toxic atmosphere composed mainly of carbon dioxide.",
        },
      },
      earth: {
        name: "Earth",
        distance: 40,
        size: 1,
        color: 0x81d4fa,
        speed: 1.0, // Reference speed - 365 days
        tilt: 0.409,
        info: {
          distance: "149.6 million km",
          diameter: "12,756 km",
          period: "365.25 days",
          temperature: "15°C (average)",
          description:
            "Our home planet, the only known planet to harbor life. Earth has liquid water and a protective atmosphere.",
        },
      },
      mars: {
        name: "Mars",
        distance: 50,
        size: 0.53,
        color: 0xffccbc,
        speed: 0.53, // 687 Earth days
        tilt: 0.439,
        info: {
          distance: "227.9 million km",
          diameter: "6,792 km",
          period: "687 Earth days",
          temperature: "-65°C (average)",
          description:
            "Known as the Red Planet due to iron oxide on its surface. Mars has the largest volcano in the solar system.",
        },
      },
      jupiter: {
        name: "Jupiter",
        distance: 70,
        size: 11.2,
        color: 0xffe0b2,
        speed: 0.084, // 12 Earth years
        tilt: 0.054,
        info: {
          distance: "778.5 million km",
          diameter: "142,984 km",
          period: "12 Earth years",
          temperature: "-110°C",
          description:
            "The largest planet in our solar system. Jupiter is a gas giant with a Great Red Spot storm larger than Earth.",
        },
      },
      saturn: {
        name: "Saturn",
        distance: 95,
        size: 9.45,
        color: 0xfff9c4,
        speed: 0.034, // 29 Earth years
        tilt: 0.466,
        hasRings: true,
        info: {
          distance: "1.43 billion km",
          diameter: "120,536 km",
          period: "29 Earth years",
          temperature: "-140°C",
          description: "Famous for its prominent ring system. Saturn is less dense than water and has 82 known moons.",
        },
      },
      uranus: {
        name: "Uranus",
        distance: 120,
        size: 4.0,
        color: 0xb3e5fc,
        speed: 0.012, // 84 Earth years
        tilt: 1.706,
        info: {
          distance: "2.87 billion km",
          diameter: "51,118 km",
          period: "84 Earth years",
          temperature: "-195°C",
          description: "An ice giant that rotates on its side. Uranus has a faint ring system and 27 known moons.",
        },
      },
      neptune: {
        name: "Neptune",
        distance: 140,
        size: 3.88,
        color: 0x90caf9,
        speed: 0.006, // 165 Earth years
        tilt: 0.494,
        info: {
          distance: "4.5 billion km",
          diameter: "49,528 km",
          period: "165 Earth years",
          temperature: "-200°C",
          description: "The windiest planet with speeds up to 2,100 km/h. Neptune is the farthest planet from the Sun.",
        },
      },
    }

    // Create orbit lines
    this.createOrbitLines()

    // Create each planet with its pivot group
    Object.keys(this.planetData).forEach((planetKey) => {
      const data = this.planetData[planetKey]

      // Create pivot group for orbital rotation
      const pivotGroup = new THREE.Group()
      pivotGroup.name = `${planetKey}-pivot`
      this.scene.add(pivotGroup)

      // Create planet group for planet and its moons/rings
      const planetGroup = new THREE.Group()
      planetGroup.name = planetKey

      // Apply axial tilt to the planet group
      planetGroup.rotation.x = data.tilt || 0

      // Create planet geometry and material
      // Scale down all planets for better visualization (Earth = 1 unit)
      const scaleFactor = 0.5 // General scale factor to make planets smaller
      const planetGeometry = new THREE.SphereGeometry(data.size * scaleFactor, 32, 32)

      // Create material with Material Design-inspired colors
      const planetMaterial = new THREE.MeshPhongMaterial({
        color: data.color,
        shininess: 15, // Lower shininess for softer look
        flatShading: false, // Smooth shading
      })

      // Create planet mesh
      const planet = new THREE.Mesh(planetGeometry, planetMaterial)
      planet.castShadow = true
      planet.receiveShadow = true

      // Position planet at its orbital distance
      planet.position.x = data.distance

      // Add planet to its group
      planetGroup.add(planet)

      // Add special features for specific planets

      // Add rings for Saturn
      if (data.hasRings) {
        const innerRadius = data.size * scaleFactor * 1.4
        const outerRadius = data.size * scaleFactor * 2.5

        const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64)
        const ringMaterial = new THREE.MeshBasicMaterial({
          color: 0xf5f5f5, // Material Grey 100 - light grey
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        })

        const rings = new THREE.Mesh(ringGeometry, ringMaterial)
        rings.rotation.x = Math.PI / 2 // Rotate to horizontal plane
        planetGroup.add(rings)
      }

      // Add Earth's moon
      if (planetKey === "earth") {
        const moonGeometry = new THREE.SphereGeometry(0.27 * scaleFactor, 16, 16)
        const moonMaterial = new THREE.MeshPhongMaterial({
          color: 0xe0e0e0, // Material Grey 300 - light grey
          shininess: 5,
        })

        const moonPivot = new THREE.Group() // Moon's own pivot for orbit
        const moon = new THREE.Mesh(moonGeometry, moonMaterial)
        moon.position.x = 2 // Moon's distance from Earth
        moon.castShadow = true
        moon.receiveShadow = true

        moonPivot.add(moon)
        planetGroup.add(moonPivot)

        // Store moon pivot for animation
        planetGroup.userData.moonPivot = moonPivot
      }

      // Add Jupiter's Great Red Spot
      if (planetKey === "jupiter") {
        const spotGeometry = new THREE.SphereGeometry(data.size * scaleFactor * 0.1, 16, 16)
        const spotMaterial = new THREE.MeshBasicMaterial({ color: 0xe57373 }) // Material Red 300
        const spot = new THREE.Mesh(spotGeometry, spotMaterial)

        // Position the spot on Jupiter's surface
        const spotPhi = Math.PI / 4 // Latitude
        const spotTheta = Math.PI / 6 // Longitude
        const spotRadius = data.size * scaleFactor * 1.01 // Slightly above surface

        spot.position.x = spotRadius * Math.sin(spotPhi) * Math.cos(spotTheta)
        spot.position.y = spotRadius * Math.sin(spotPhi) * Math.sin(spotTheta)
        spot.position.z = spotRadius * Math.cos(spotPhi)

        planet.add(spot)
      }

      // Add planet group to pivot group
      pivotGroup.add(planetGroup)

      // Store references and data
      planetGroup.userData = {
        ...data,
        planet: planet,
        initialPosition: new THREE.Vector3(data.distance, 0, 0),
      }

      this.planets.push({
        pivot: pivotGroup,
        group: planetGroup,
        data: data,
      })
    })

    // Update objects count
    document.getElementById("objects").textContent = this.scene.children.length
  }

  createOrbitLines() {
    // Create orbit lines for visual reference
    Object.keys(this.planetData).forEach((planetKey) => {
      const data = this.planetData[planetKey]

      // Create orbit geometry
      const orbitGeometry = new THREE.BufferGeometry()
      const orbitSegments = 128 // Segments for smooth circle
      const orbitVertices = []

      // Create circle points
      for (let i = 0; i <= orbitSegments; i++) {
        const theta = (i / orbitSegments) * Math.PI * 2
        orbitVertices.push(
          data.distance * Math.cos(theta), // x
          0, // y (flat on xz plane)
          data.distance * Math.sin(theta), // z
        )
      }

      // Set orbit vertices
      orbitGeometry.setAttribute("position", new THREE.Float32BufferAttribute(orbitVertices, 3))

      // Create orbit material - subtle, semi-transparent
      const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0x666666,
        transparent: true,
        opacity: 0.3,
        linewidth: 1,
      })

      // Create orbit line and add to scene
      const orbit = new THREE.Line(orbitGeometry, orbitMaterial)
      this.scene.add(orbit)
      this.orbits.push(orbit)
    })
  }

  setupLighting() {
    // Ambient light - provides base illumination for entire scene
    const ambientLight = new THREE.AmbientLight(0x404040, 0.2)
    this.scene.add(ambientLight)

    // Point light at sun position - creates realistic lighting from sun
    const sunLight = new THREE.PointLight(0xffffff, 2, 1000, 1)
    sunLight.position.set(0, 0, 0) // At the center (sun position)
    sunLight.castShadow = true

    // Configure shadow quality
    sunLight.shadow.mapSize.width = 2048
    sunLight.shadow.mapSize.height = 2048
    sunLight.shadow.camera.near = 0.5
    sunLight.shadow.camera.far = 500

    this.scene.add(sunLight)

    // Add a subtle directional light to enhance visibility of planets
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3)
    directionalLight.position.set(100, 100, 100)
    this.scene.add(directionalLight)
  }

  setupControls() {
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.minDistance = 10
    this.controls.maxDistance = 500
    this.controls.autoRotate = false
    this.controls.autoRotateSpeed = 0.5
  }

  setupEventListeners() {
    // Window resize
    window.addEventListener("resize", () => this.onWindowResize())

    // Speed control
    this.speedSlider.addEventListener("input", (e) => {
      this.animationSpeed = Number.parseFloat(e.target.value)
      document.getElementById("speed-value").textContent = `${this.animationSpeed}x`
    })

    // Scale control
    this.scaleSlider.addEventListener("input", (e) => {
      this.planetScale = Number.parseFloat(e.target.value)
      document.getElementById("scale-value").textContent = `${this.planetScale}x`
      this.updatePlanetScale()
    })

    // Play/Pause button
    this.playPauseBtn.addEventListener("click", () => {
      this.isPlaying = !this.isPlaying
      this.playPauseBtn.textContent = this.isPlaying ? "⏸️ Pause" : "▶️ Play"
    })

    // Reset button
    this.resetBtn.addEventListener("click", () => this.resetSimulation())

    // Fullscreen button
    this.fullscreenBtn.addEventListener("click", () => this.toggleFullscreen())

    // Planet selection
    this.planetSelect.addEventListener("change", (e) => {
      this.focusOnPlanet(e.target.value)
    })

    // Planet clicking
    this.renderer.domElement.addEventListener("click", (e) => this.onPlanetClick(e))

    // Close info panel
    document.querySelector(".close-btn").addEventListener("click", () => {
      this.planetInfo.classList.remove("active")
    })

    // Keyboard controls
    document.addEventListener("keydown", (e) => this.onKeyDown(e))

    // Individual planet speed controls
    document.querySelectorAll(".planet-speed-slider").forEach((slider) => {
      slider.addEventListener("input", (e) => {
        const planetName = e.target.dataset.planet
        const speed = Number.parseFloat(e.target.value)

        // Update planet speed multiplier
        this.planetSpeedMultipliers[planetName] = speed

        // Update display
        document.getElementById(`${planetName}-speed-value`).textContent = `${speed.toFixed(1)}x`

        // Add visual feedback
        e.target.style.background = `linear-gradient(to right, var(--primary-500) 0%, var(--primary-500) ${(speed / 3) * 100}%, var(--grey-700) ${(speed / 3) * 100}%, var(--grey-700) 100%)`
      })
    })

    // Speed panel toggle
    document.getElementById("toggle-speed-panel").addEventListener("click", () => {
      const panel = document.querySelector(".speed-control-panel")
      panel.classList.toggle("collapsed")

      const toggleBtn = document.getElementById("toggle-speed-panel")
      toggleBtn.textContent = panel.classList.contains("collapsed") ? "📊" : "📉"
    })

    // Reset all speeds
    document.getElementById("reset-all-speeds").addEventListener("click", () => {
      Object.keys(this.planetSpeedMultipliers).forEach((planetName) => {
        this.planetSpeedMultipliers[planetName] = 1.0
        const slider = document.getElementById(`${planetName}-speed`)
        const display = document.getElementById(`${planetName}-speed-value`)

        slider.value = 1.0
        display.textContent = "1.0x"

        // Reset slider background
        slider.style.background = ""
      })

      // Visual feedback
      const btn = document.getElementById("reset-all-speeds")
      btn.classList.add("success")
      btn.textContent = "✅ Reset!"
      setTimeout(() => {
        btn.classList.remove("success")
        btn.textContent = "🔄 Reset All"
      }, 1500)
    })

    // Sync all speeds
    document.getElementById("sync-speeds").addEventListener("click", () => {
      const globalSpeed = this.animationSpeed

      Object.keys(this.planetSpeedMultipliers).forEach((planetName) => {
        this.planetSpeedMultipliers[planetName] = globalSpeed
        const slider = document.getElementById(`${planetName}-speed`)
        const display = document.getElementById(`${planetName}-speed-value`)

        slider.value = globalSpeed
        display.textContent = `${globalSpeed.toFixed(1)}x`

        // Update slider background
        slider.style.background = `linear-gradient(to right, var(--primary-500) 0%, var(--primary-500) ${(globalSpeed / 3) * 100}%, var(--grey-700) ${(globalSpeed / 3) * 100}%, var(--grey-700) 100%)`
      })

      // Visual feedback
      const btn = document.getElementById("sync-speeds")
      btn.classList.add("success")
      btn.textContent = "⚡ Synced!"
      setTimeout(() => {
        btn.classList.remove("success")
        btn.textContent = "⚡ Sync All"
      }, 1500)
    })

    // Theme toggle
    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
      this.toggleTheme()
    })

    // Enhanced planet hover and click effects
    this.renderer.domElement.addEventListener("mousemove", (e) => this.onMouseMove(e))
    this.renderer.domElement.addEventListener("mouseleave", () => this.hideTooltip())

    // Create shooting stars
    this.createShootingStars()

    // Enhanced Play/Pause button
    this.playPauseBtn.addEventListener("click", () => {
      this.isPlaying = !this.isPlaying

      const btn = this.playPauseBtn
      btn.classList.toggle("paused", !this.isPlaying)
      btn.textContent = this.isPlaying ? "⏸️ Pause" : "▶️ Play"

      // Add ripple effect
      btn.style.transform = "scale(0.95)"
      setTimeout(() => {
        btn.style.transform = "scale(1)"
      }, 150)
    })
  }

  updatePlanetScale() {
    this.planets.forEach((planetObj) => {
      const planet = planetObj.group.userData.planet
      planet.scale.setScalar(this.planetScale)
    })
  }

  resetSimulation() {
    this.planets.forEach((planetObj) => {
      planetObj.pivot.rotation.y = 0
    })
    this.camera.position.set(0, 50, 100)
    this.controls.target.set(0, 0, 0)
    this.controls.reset()
    this.animationSpeed = 1
    this.planetScale = 1
    this.speedSlider.value = 1
    this.scaleSlider.value = 1
    document.getElementById("speed-value").textContent = "1x"
    document.getElementById("scale-value").textContent = "1x"
    this.updatePlanetScale()
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      this.fullscreenBtn.textContent = "🔍 Exit Fullscreen"
    } else {
      document.exitFullscreen()
      this.fullscreenBtn.textContent = "🔍 Fullscreen"
    }
  }

  focusOnPlanet(planetName) {
    if (planetName === "overview") {
      this.camera.position.set(0, 50, 100)
      this.controls.target.set(0, 0, 0)
      return
    }

    const planetObj = this.planets.find((p) => p.group.name === planetName)
    if (planetObj) {
      const planet = planetObj.group.userData.planet
      const worldPosition = new THREE.Vector3()
      planet.getWorldPosition(worldPosition)

      const distance = planetObj.data.size * 5
      this.camera.position.copy(worldPosition)
      this.camera.position.z += distance
      this.controls.target.copy(worldPosition)
    } else if (planetName === "sun") {
      this.camera.position.set(0, 0, 20)
      this.controls.target.set(0, 0, 0)
    }
  }

  onPlanetClick(event) {
    if (this.isZooming) return

    const mouse = new THREE.Vector2()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const intersects = raycaster.intersectObjects(this.scene.children, true)

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object
      let planetData = null
      let targetPosition = null

      if (clickedObject === this.sun) {
        planetData = {
          name: "Sun",
          info: {
            distance: "0 km (center)",
            diameter: "1,392,700 km",
            period: "N/A",
            temperature: "5,778 K (surface)",
            description:
              "The Sun is the star at the center of our solar system. It contains 99.86% of the mass in the solar system.",
          },
        }
        targetPosition = new THREE.Vector3(0, 0, 20)
      } else {
        // Find parent planet group
        let parent = clickedObject.parent
        while (parent && !parent.userData.name) {
          parent = parent.parent
        }
        if (parent && parent.userData) {
          planetData = parent.userData

          const planet = parent.userData.planet
          const worldPosition = new THREE.Vector3()
          planet.getWorldPosition(worldPosition)

          const distance = parent.userData.size * 8
          targetPosition = worldPosition.clone()
          targetPosition.z += distance
        }
      }

      if (planetData && targetPosition) {
        this.zoomToPlanet(targetPosition, planetData)
      }
    }
  }

  zoomToPlanet(targetPosition, planetData) {
    this.isZooming = true

    // Add zoom transition class
    this.renderer.domElement.classList.add("zoom-transition")

    // Smooth camera transition
    const startPosition = this.camera.position.clone()
    const startTarget = this.controls.target.clone()

    let progress = 0
    const duration = 1500 // 1.5 seconds
    const startTime = Date.now()

    const animateZoom = () => {
      const elapsed = Date.now() - startTime
      progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeProgress = 1 - Math.pow(1 - progress, 3)

      // Interpolate camera position
      this.camera.position.lerpVectors(startPosition, targetPosition, easeProgress)
      this.controls.target.lerpVectors(startTarget, new THREE.Vector3(0, 0, 0), easeProgress)

      if (progress < 1) {
        requestAnimationFrame(animateZoom)
      } else {
        this.isZooming = false
        this.renderer.domElement.classList.remove("zoom-transition")
        this.showPlanetInfo(planetData)
      }
    }

    animateZoom()
  }

  createShootingStars() {
    // Create occasional shooting stars
    setInterval(() => {
      if (Math.random() < 0.3) {
        // 30% chance every interval
        this.createShootingStar()
      }
    }, 5000) // Every 5 seconds
  }

  createShootingStar() {
    const shootingStar = document.createElement("div")
    shootingStar.className = "shooting-star"

    // Random starting position
    shootingStar.style.left = Math.random() * 100 + "vw"
    shootingStar.style.top = Math.random() * 100 + "vh"

    // Random animation duration
    shootingStar.style.animationDuration = 2 + Math.random() * 3 + "s"

    document.body.appendChild(shootingStar)

    // Remove after animation
    setTimeout(() => {
      if (shootingStar.parentNode) {
        shootingStar.parentNode.removeChild(shootingStar)
      }
    }, 5000)
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode
    const theme = this.isDarkMode ? "dark" : "light"

    document.documentElement.setAttribute("data-theme", theme)

    const themeBtn = document.getElementById("theme-toggle-btn")
    themeBtn.textContent = this.isDarkMode ? "☀️ Light" : "🌙 Dark"

    // Add visual feedback
    themeBtn.style.transform = "scale(0.95)"
    setTimeout(() => {
      themeBtn.style.transform = "scale(1)"
    }, 150)

    // Update star field colors based on theme
    this.updateStarFieldTheme()
  }

  updateStarFieldTheme() {
    if (this.stars) {
      const material = this.stars.material
      if (this.isDarkMode) {
        material.opacity = 0.8
      } else {
        material.opacity = 0.4
      }
    }
  }

  onMouseMove(event) {
    const mouse = new THREE.Vector2()
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(mouse, this.camera)

    const intersects = raycaster.intersectObjects(this.scene.children, true)

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object
      let planetData = null

      if (clickedObject === this.sun) {
        planetData = {
          name: "Sun",
          info: "The center of our solar system. Surface temperature: 5,778K",
        }
      } else {
        // Find parent planet group
        let parent = clickedObject.parent
        while (parent && !parent.userData.name) {
          parent = parent.parent
        }
        if (parent && parent.userData) {
          const data = parent.userData
          planetData = {
            name: data.name,
            info: `Distance: ${data.info.distance} • Period: ${data.info.period}`,
          }
        }
      }

      if (planetData && planetData.name !== this.hoveredPlanet) {
        this.hoveredPlanet = planetData.name
        this.showTooltip(event.clientX, event.clientY, planetData)

        // Add hover glow effect
        if (clickedObject.material) {
          clickedObject.material.emissive.setHex(0x444444)
        }
      }
    } else {
      this.hideTooltip()
      this.hoveredPlanet = null
    }
  }

  showTooltip(x, y, planetData) {
    const tooltip = this.planetTooltip

    document.getElementById("tooltip-name").textContent = planetData.name
    document.getElementById("tooltip-info").textContent = planetData.info

    tooltip.style.left = `${x + 15}px`
    tooltip.style.top = `${y - 10}px`
    tooltip.classList.add("visible")
  }

  hideTooltip() {
    this.planetTooltip.classList.remove("visible")

    // Remove hover glow effects
    this.planets.forEach((planetObj) => {
      const planet = planetObj.group.userData.planet
      if (planet && planet.material) {
        planet.material.emissive.setHex(0x000000)
      }
    })

    if (this.sun && this.sun.material) {
      this.sun.material.emissive.setHex(0xffdd00)
    }
  }

  updateFPS() {
    this.frameCount++
    const currentTime = performance.now()

    if (currentTime - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
      document.getElementById("fps").textContent = this.fps
      this.frameCount = 0
      this.lastTime = currentTime
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate())

    if (this.isPlaying) {
      const deltaTime = this.clock.getDelta()
      const elapsedTime = this.clock.getElapsedTime()

      // Rotate sun with pulsing glow effect
      if (this.sun) {
        this.sun.rotation.y += 0.005 * this.animationSpeed

        // Add subtle pulsing effect to the sun's glow
        const pulse = Math.sin(elapsedTime * 2) * 0.1 + 1 // Gentle pulsing between 0.9 and 1.1

        if (this.sunLight) {
          this.sunLight.intensity = 3 * pulse // Pulse the main light
        }
        if (this.warmLight) {
          this.warmLight.intensity = 1.5 * pulse // Pulse the warm light
        }
      }

      // Enhanced planet animation with individual speed controls
      this.planets.forEach((planetObj) => {
        const pivot = planetObj.pivot
        const group = planetObj.group
        const data = planetObj.data
        const planet = group.userData.planet

        // ORBITAL REVOLUTION with individual speed multiplier
        const baseOrbitSpeed = 0.001
        const planetSpeedMultiplier = this.planetSpeedMultipliers[data.name.toLowerCase()] || 1.0
        const orbitSpeed = data.speed * baseOrbitSpeed * this.animationSpeed * planetSpeedMultiplier

        // Rotate the pivot group to make planet revolve around sun
        pivot.rotation.y += orbitSpeed

        // AXIAL ROTATION - Planet rotating on its own axis
        // Different rotation speeds for variety and realism
        if (planet) {
          let axialSpeed = 0.02 // Base axial rotation speed

          // Customize axial rotation speeds for specific planets
          switch (data.name) {
            case "Mercury":
              axialSpeed = 0.004 // Very slow rotation (59 Earth days)
              break
            case "Venus":
              axialSpeed = -0.002 // Retrograde rotation (243 Earth days, backwards)
              break
            case "Earth":
              axialSpeed = 0.02 // Standard rotation (24 hours)
              break
            case "Mars":
              axialSpeed = 0.019 // Similar to Earth (24.6 hours)
              break
            case "Jupiter":
              axialSpeed = 0.045 // Fast rotation (9.9 hours)
              break
            case "Saturn":
              axialSpeed = 0.038 // Fast rotation (10.7 hours)
              break
            case "Uranus":
              axialSpeed = 0.014 // Moderate rotation (17.2 hours)
              break
            case "Neptune":
              axialSpeed = 0.016 // Moderate rotation (16.1 hours)
              break
          }

          // Apply axial rotation
          planet.rotation.y += axialSpeed * this.animationSpeed
        }

        // Special animations for moons and rings

        // Animate Earth's moon orbit
        if (data.name === "Earth" && group.userData.moonPivot) {
          // Moon orbits Earth every ~27 days (much faster in simulation)
          const moonOrbitSpeed = 0.05 * this.animationSpeed
          group.userData.moonPivot.rotation.y += moonOrbitSpeed

          // Moon's axial rotation (tidally locked - same face always toward Earth)
          const moonMesh = group.userData.moonPivot.children[0]
          if (moonMesh) {
            moonMesh.rotation.y += moonOrbitSpeed // Synchronized with orbit
          }
        }

        // Animate Saturn's rings
        if (data.hasRings && data.name === "Saturn") {
          // Find ring mesh and add subtle rotation
          group.children.forEach((child) => {
            if (child.geometry && child.geometry.type === "RingGeometry") {
              child.rotation.z += 0.001 * this.animationSpeed // Very slow ring rotation
            }
          })
        }

        // Add subtle wobble to planets for more realistic motion
        const wobbleAmplitude = 0.002
        const wobbleFrequency = elapsedTime * 0.5 + data.distance * 0.1
        group.rotation.x = data.tilt + Math.sin(wobbleFrequency) * wobbleAmplitude
      })

      // Rotate stars slowly for dynamic background
      if (this.stars) {
        this.stars.rotation.y += 0.0001 * this.animationSpeed
        this.stars.rotation.x += 0.00005 * this.animationSpeed
      }

      // Animate orbit lines with subtle pulsing
      this.orbits.forEach((orbit, index) => {
        const pulseFactor = Math.sin(elapsedTime * 0.5 + index * 0.5) * 0.1 + 0.3
        orbit.material.opacity = pulseFactor
      })
    }

    // Update controls with smooth damping
    this.controls.update()

    // Render the scene
    this.renderer.render(this.scene, this.camera)

    // Update performance statistics
    this.updateFPS()
  }
}

// Initialize the simulation when the page loads
document.addEventListener("DOMContentLoaded", () => {
  new SolarSystemSimulation()
})

// Handle page visibility changes for performance
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    // Pause animation when tab is not visible
    console.log("Tab hidden - consider pausing animation")
  } else {
    // Resume animation when tab becomes visible
    console.log("Tab visible - resume animation")
  }
})
