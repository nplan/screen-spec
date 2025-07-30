from math import atan, degrees, cos, sin, sqrt
from typing import Optional

class Screen:
    def __init__(self,
                 diagonal: float,
                 resolution: tuple[int, int],
                 distance: float,
                 curvature: Optional[float] = None,
                 scaling: float = 1):
        """
        Initialize a Screen object.

        :param diagonal: Diagonal of the screen in inches.
        :param resolution: Tuple containing the resolution (width, height) in pixels.
        :param distance: Distance from the eyes to the screen in millimeters.
        :param curvature: Curvature of the screen in millimeters, None for flat screens.
        :param scaling: Scaling factor for the resolution.
        """
        # Validate inputs
        if diagonal <= 0:
            raise ValueError("Diagonal must be a positive number.")
        if not (isinstance(resolution, tuple) and len(resolution) == 2 and all(isinstance(x, int) and x > 0 for x in resolution)):
            raise ValueError("Resolution must be a tuple of two positive integers (width, height).")
        if distance <= 0:
            raise ValueError("Distance must be a positive number.")
        if curvature is not None and curvature < 0:
            raise ValueError("Curvature must be non-negative or None.")
        if scaling <= 0:
            raise ValueError("Scaling must be a positive number.")

        self.diagonal = diagonal
        self.resolution = resolution
        self.distance = distance
        self.curvature = curvature
        self.scaling = scaling

    @property
    def width(self) -> float:
        """
        Calculate the width of the screen in millimeters.
        If curved, width is arc length.
        :return: width in millimeters.
        """
        ratio = self.resolution[0] / self.resolution[1]
        height = self.diagonal / ((ratio ** 2 + 1) ** 0.5) * 25.4
        width = ratio * height
        return width

    @property
    def height(self) -> float:
        """
        Calculate the height of the screen in millimeters.
        :return: height in millimeters.
        """
        ratio = self.resolution[0] / self.resolution[1]
        height = self.diagonal / ((ratio ** 2 + 1) ** 0.5) * 25.4
        return height
    
    @property
    def size(self) -> tuple[float, float]:
        """
        Size of the screen in millimeters (width, height).
        :return: Tuple of width and height in millimeters.
        """
        return (self.width, self.height)

    @property
    def ppi(self) -> int:
        """
        Pixels per inch (PPI).
        :return: ppi
        """
        width = self.width / 25.4
        ppi = self.resolution[0] / width
        return round(ppi)

    @property
    def ppi_scaled(self) -> int:
        """
        Scaled pixels per inch (PPI).
        :return: ppi_scaled
        """
        return round(self.ppi / self.scaling)
    
    @property
    def pixel_size(self) -> float:
        """
        Size of a single pixel in millimeters.
        :return: Pixel size in millimeters.
        """
        return 25.4 / self.ppi
    
    @property
    def fov_horizontal(self) -> float:
        """
        Horizontal field of view (FOV) in degrees.
        :return: FOV in degrees.
        """
        if self.curvature is None:
            angle = degrees(2 * atan(self.width / 2 / (self.distance)))
        else:
            arc_angle = self.width / self.curvature  # angle of the screen arc in radians
            arc_width = 2 * self.curvature * sin(arc_angle / 2)  # width of the screen arc
            arc_depth = self.curvature * (1 - cos(arc_angle / 2))  # depth of the screen arc
            arc_end_dist = self.distance - arc_depth  # distance to the arc center
            angle = degrees(2 * atan(arc_width / 2 / arc_end_dist))
            angle = angle if angle >= 0 else 360 + angle  # ensure angle is positive
        return angle
        
    @property
    def fov_vertical(self) -> float:
        """
        Vertical field of view (FOV) in degrees.
        :return: FOV in degrees.
        """
        height = self.height
        angle = degrees(2 * atan(height / 2 / (self.distance)))
        return angle

    @property
    def ppd(self) -> float:
        """
        Pixels per degree (PPD) of the screen.
        Calculated using the pixel size and the distance to the screen.
        :return: PPD in pixels per degree.
        """
        angle = degrees(atan(self.pixel_size / (self.distance)))
        return 1 / angle
    
    @property
    def ppd_edge(self) -> float:
        """
        Pixels per degree (PPD) at the edge of the screen.
        The edge is further away than the center.
        :return: PPD at the edge in pixels per degree.
        """
        if self.curvature is None:
            distance_edge  = sqrt(self.distance**2 + (self.width / 2)**2)
            angle = degrees(atan(self.pixel_size / (distance_edge)))
            return 1 / angle
        else:
            arc_angle = self.width / self.curvature  # angle of the screen arc in radians
            arc_width = 2 * self.curvature * sin(arc_angle / 2)  # width of the screen arc
            arc_depth = self.curvature * (1 - cos(arc_angle / 2))  # depth of the screen arc
            arc_end_dist = self.distance - arc_depth  # distance to the arc center
            distance_edge = sqrt(arc_end_dist**2 + (arc_width / 2)**2)
            angle = degrees(atan(self.pixel_size / (distance_edge)))
        return 1 / angle
    
    @property
    def resolution_scaled(self) -> tuple[int, int]:
        """
        Scaled resolution based on the scaling factor.
        :return: Tuple of scaled resolution (width, height).
        """
        return (round(self.resolution[0] / self.scaling),
                round(self.resolution[1] / self.scaling))
    
    def __str__(self):
        return (
            f"Screen("
            f"diagonal={self.diagonal}, "
            f"resolution={self.resolution}, "
            f"distance={self.distance}, "
            f"curvature={self.curvature}, "
            f"scaling={self.scaling}, "
            f"width={self.width:.2f}, "
            f"height={self.height:.2f}, "
            f"size=({self.size[0]:.2f}, {self.size[1]:.2f}), "
            f"ppi={self.ppi}, "
            f"ppi_scaled={self.ppi_scaled}, "
            f"pixel_size={self.pixel_size:.4f}, "
            f"fov_horizontal={self.fov_horizontal:.2f}, "
            f"fov_vertical={self.fov_vertical:.2f}, "
            f"ppd={self.ppd:.2f}, "
            f"ppd_edge={self.ppd_edge:.2f}, "
            f"resolution_scaled={self.resolution_scaled}"
            f")"
        )

if __name__ == "__main__":
    # Example usage
    screen = Screen(diagonal=45,
                    resolution=(5120, 2160),
                    distance=800,
                    curvature=800,
                    scaling=1.25)

    print(screen)
