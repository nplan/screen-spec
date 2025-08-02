// Import configuration constants
import { CONFIG } from './config.js';

class Screen {
    constructor(diagonal, resolution, distance, curvature = null, scaling = 1) {
        /**
         * Initialize a screen object.
         * 
         * @param {number} diagonal - Diagonal of the screen in inches.
         * @param {[number, number]} resolution - Array containing the resolution [width, height] in pixels.
         * @param {number} distance - Distance from the eyes to the screen in millimeters.
         * @param {number|null} curvature - Curvature of the screen in millimeters, null for flat screens.
         * @param {number} scaling - Scaling factor for the resolution.
         */
        
        // Validate inputs
        if (diagonal <= 0) {
            throw new Error("Screen diagonal must be greater than 0 inches");
        }
        if (diagonal > CONFIG.LIMITS.DIAGONAL.MAX) {
            throw new Error(`Screen diagonal too large (maximum ${CONFIG.LIMITS.DIAGONAL.MAX} inches)`);
        }
        if (!Array.isArray(resolution) || resolution.length !== 2) {
            throw new Error("Resolution must be an array with width and height [width, height]");
        }
        if (!resolution.every(x => Number.isInteger(x) && x > 0)) {
            throw new Error("Resolution width and height must be positive whole numbers");
        }
        if (resolution[0] > CONFIG.LIMITS.RESOLUTION.MAX || resolution[1] > CONFIG.LIMITS.RESOLUTION.MAX) {
            throw new Error(`Resolution values too large (maximum ${CONFIG.LIMITS.RESOLUTION.MAX} pixels)`);
        }
        if (distance <= 0) {
            throw new Error("Viewing distance must be greater than 0mm");
        }
        if (distance < CONFIG.LIMITS.DISTANCE.MIN) {
            throw new Error(`Viewing distance too close (minimum ${CONFIG.LIMITS.DISTANCE.MIN}mm)`);
        }
        if (distance > CONFIG.LIMITS.DISTANCE.MAX) {
            throw new Error(`Viewing distance too far (maximum ${CONFIG.LIMITS.DISTANCE.MAX}mm)`);
        }
        if (curvature !== null && curvature < 0) {
            throw new Error("Curvature radius cannot be negative");
        }
        if (curvature !== null && curvature < CONFIG.LIMITS.CURVATURE.MIN) {
            throw new Error(`Curvature radius too tight (minimum ${CONFIG.LIMITS.CURVATURE.MIN}mm)`);
        }
        if (scaling <= 0) {
            throw new Error("Scaling factor must be greater than 0");
        }
        if (scaling < CONFIG.LIMITS.SCALING.MIN / 100) {
            throw new Error(`Scaling factor too small (minimum ${CONFIG.LIMITS.SCALING.MIN}%)`);
        }
        if (scaling > CONFIG.LIMITS.SCALING.MAX / 100) {
            throw new Error(`Scaling factor too large (maximum ${CONFIG.LIMITS.SCALING.MAX}%)`);
        }

        this.diagonal = diagonal;
        this.resolution = resolution;
        this.distance = distance;
        this.curvature = curvature;
        this.scaling = scaling;
    }

    get width() {
        /**
         * Calculate the width of the screen in millimeters.
         * If curved, width is arc length.
         * @return {number} width in millimeters.
         */
        const ratio = this.resolution[0] / this.resolution[1];
        const height = this.diagonal / Math.sqrt(ratio ** 2 + 1) * CONFIG.PHYSICS.INCHES_TO_MM;
        const width = ratio * height;
        return width;
    }

    get height() {
        /**
         * Calculate the height of the screen in millimeters.
         * @return {number} height in millimeters.
         */
        const ratio = this.resolution[0] / this.resolution[1];
        const height = this.diagonal / Math.sqrt(ratio ** 2 + 1) * CONFIG.PHYSICS.INCHES_TO_MM;
        return height;
    }

    get size() {
        /**
         * Size of the screen in millimeters [width, height].
         * @return {[number, number]} Array of width and height in millimeters.
         */
        return [this.width, this.height];
    }

    get ppi() {
        /**
         * Pixels per inch (PPI).
         * @return {number} ppi
         */
        const width = this.width / CONFIG.PHYSICS.INCHES_TO_MM;
        const ppi = this.resolution[0] / width;
        return Math.round(ppi);
    }

    get ppi_scaled() {
        /**
         * Scaled pixels per inch (PPI).
         * @return {number} ppi_scaled
         */
        return Math.round(this.ppi / this.scaling);
    }

    get pixel_size() {
        /**
         * Size of a single pixel in millimeters.
         * @return {number} Pixel size in millimeters.
         */
        return CONFIG.PHYSICS.INCHES_TO_MM / this.ppi;
    }

    get fov_horizontal() {
        /**
         * Horizontal field of view (FOV) in degrees.
         * @return {number} FOV in degrees.
         */
        let angle;
        if (this.curvature === null) {
            angle = CONFIG.PHYSICS.RADIANS_TO_DEGREES * (2 * Math.atan(this.width / 2 / this.distance));
        } else {
            const arc_angle = this.width / this.curvature; // angle of the screen arc in radians
            const arc_width = 2 * this.curvature * Math.sin(arc_angle / 2); // width of the screen arc
            const arc_depth = this.curvature * (1 - Math.cos(arc_angle / 2)); // depth of the screen arc
            const arc_end_dist = this.distance - arc_depth; // distance to the arc center
            angle = CONFIG.PHYSICS.RADIANS_TO_DEGREES * (2 * Math.atan(arc_width / 2 / arc_end_dist));
            angle = angle >= 0 ? angle : 360 + angle; // ensure angle is positive
        }
        return angle;
    }

    get fov_vertical() {
        /**
         * Vertical field of view (FOV) in degrees.
         * @return {number} FOV in degrees.
         */
        const height = this.height;
        const angle = CONFIG.PHYSICS.RADIANS_TO_DEGREES * (2 * Math.atan(height / 2 / this.distance));
        return angle;
    }

    get ppd() {
        /**
         * Pixels per degree (PPD) of the screen.
         * Calculated using the pixel size and the distance to the screen.
         * @return {number} PPD in pixels per degree.
         */
        const angle = CONFIG.PHYSICS.RADIANS_TO_DEGREES * Math.atan(this.pixel_size / this.distance);
        return 1 / angle;
    }

    get ppd_edge() {
        /**
         * Pixels per degree (PPD) at the edge of the screen.
         * The edge is further away than the center.
         * @return {number} PPD at the edge in pixels per degree.
         */
        let angle;
        if (this.curvature === null) {
            const distance_edge = Math.sqrt(this.distance ** 2 + (this.width / 2) ** 2);
            angle = CONFIG.PHYSICS.RADIANS_TO_DEGREES * Math.atan(this.pixel_size / distance_edge);
        } else {
            const arc_angle = this.width / this.curvature; // angle of the screen arc in radians
            const arc_width = 2 * this.curvature * Math.sin(arc_angle / 2); // width of the screen arc
            const arc_depth = this.curvature * (1 - Math.cos(arc_angle / 2)); // depth of the screen arc
            const arc_end_dist = this.distance - arc_depth; // distance to the arc center
            const distance_edge = Math.sqrt(arc_end_dist ** 2 + (arc_width / 2) ** 2);
            angle = CONFIG.PHYSICS.RADIANS_TO_DEGREES * Math.atan(this.pixel_size / distance_edge);
        }
        return 1 / angle;
    }

    get ppd_scaled() {
        /**
         * Scaled pixels per degree (PPD) based on the scaling factor.
         * @return {number} Scaled PPD in pixels per degree.
         */
        return this.ppd / this.scaling;
    }

    get resolution_scaled() {
        /**
         * Scaled resolution based on the scaling factor.
         * @return {[number, number]} Array of scaled resolution [width, height].
         */
        return [
            Math.round(this.resolution[0] / this.scaling),
            Math.round(this.resolution[1] / this.scaling)
        ];
    }

    toString() {
        return (
            `Screen(` +
            `diagonal=${this.diagonal}, ` +
            `resolution=[${this.resolution[0]}, ${this.resolution[1]}], ` +
            `distance=${this.distance}, ` +
            `curvature=${this.curvature}, ` +
            `scaling=${this.scaling}, ` +
            `width=${this.width.toFixed(2)}, ` +
            `height=${this.height.toFixed(2)}, ` +
            `size=[${this.size[0].toFixed(2)}, ${this.size[1].toFixed(2)}], ` +
            `ppi=${this.ppi}, ` +
            `ppi_scaled=${this.ppi_scaled}, ` +
            `pixel_size=${this.pixel_size.toFixed(4)}, ` +
            `fov_horizontal=${this.fov_horizontal.toFixed(2)}, ` +
            `fov_vertical=${this.fov_vertical.toFixed(2)}, ` +
            `ppd=${this.ppd.toFixed(2)}, ` +
            `ppd_edge=${this.ppd_edge.toFixed(2)}, ` +
            `ppd_scaled=${this.ppd_scaled.toFixed(2)}, ` +
            `resolution_scaled=[${this.resolution_scaled[0]}, ${this.resolution_scaled[1]}]` +
            `)`
        );
    }
}

// Example usage (equivalent to if __name__ == "__main__" in Python)
if (typeof require !== 'undefined' && require.main === module) {
    // Example usage
    const screen = new Screen(
        45,           // diagonal
        [5120, 2160], // resolution
        CONFIG.DEFAULTS.TEST_SCREEN.DISTANCE,          // distance
        CONFIG.DEFAULTS.TEST_SCREEN.CURVATURE,          // curvature
        1.25          // scaling
    );

    console.log(screen.toString());
}

// Export for ES6 modules
export { Screen };
