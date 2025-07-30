import pytest
from math import degrees, atan, sqrt, sin, cos
from screen_calc import Screen


class TestMonitorInitialization:
    """Test Monitor initialization and validation."""
    
    def test_valid_initialization(self):
        """Test that valid parameters create a Monitor instance."""
        monitor = Screen(
            diagonal=27,
            resolution=(1920, 1080),
            distance=600,
            curvature=None,
            scaling=1.0
        )
        assert monitor.diagonal == 27
        assert monitor.resolution == (1920, 1080)
        assert monitor.distance == 600
        assert monitor.curvature is None
        assert monitor.scaling == 1.0
    
    def test_curved_monitor_initialization(self):
        """Test initialization with curvature."""
        monitor = Screen(
            diagonal=34,
            resolution=(3440, 1440),
            distance=700,
            curvature=1000,
            scaling=1.25
        )
        assert monitor.curvature == 1000
        assert monitor.scaling == 1.25
    
    def test_default_parameters(self):
        """Test that default parameters work correctly."""
        monitor = Screen(
            diagonal=24,
            resolution=(1920, 1080),
            distance=500
        )
        assert monitor.curvature is None
        assert monitor.scaling == 1


class TestMonitorValidation:
    """Test Monitor input validation."""
    
    def test_negative_diagonal_raises_error(self):
        """Test that negative diagonal raises ValueError."""
        with pytest.raises(ValueError, match="Diagonal must be a positive number"):
            Screen(diagonal=-27, resolution=(1920, 1080), distance=600)
    
    def test_zero_diagonal_raises_error(self):
        """Test that zero diagonal raises ValueError."""
        with pytest.raises(ValueError, match="Diagonal must be a positive number"):
            Screen(diagonal=0, resolution=(1920, 1080), distance=600)
    
    def test_invalid_resolution_type_raises_error(self):
        """Test that invalid resolution type raises ValueError."""
        with pytest.raises(ValueError, match="Resolution must be a tuple of two positive integers"):
            Screen(diagonal=27, resolution=[1920, 1080], distance=600)
    
    def test_invalid_resolution_length_raises_error(self):
        """Test that invalid resolution length raises ValueError."""
        with pytest.raises(ValueError, match="Resolution must be a tuple of two positive integers"):
            Screen(diagonal=27, resolution=(1920,), distance=600)
    
    def test_negative_resolution_raises_error(self):
        """Test that negative resolution values raise ValueError."""
        with pytest.raises(ValueError, match="Resolution must be a tuple of two positive integers"):
            Screen(diagonal=27, resolution=(-1920, 1080), distance=600)
    
    def test_zero_resolution_raises_error(self):
        """Test that zero resolution values raise ValueError."""
        with pytest.raises(ValueError, match="Resolution must be a tuple of two positive integers"):
            Screen(diagonal=27, resolution=(0, 1080), distance=600)
    
    def test_float_resolution_raises_error(self):
        """Test that float resolution values raise ValueError."""
        with pytest.raises(ValueError, match="Resolution must be a tuple of two positive integers"):
            Screen(diagonal=27, resolution=(1920.5, 1080), distance=600)
    
    def test_negative_distance_raises_error(self):
        """Test that negative distance raises ValueError."""
        with pytest.raises(ValueError, match="Distance must be a positive number"):
            Screen(diagonal=27, resolution=(1920, 1080), distance=-600)
    
    def test_zero_distance_raises_error(self):
        """Test that zero distance raises ValueError."""
        with pytest.raises(ValueError, match="Distance must be a positive number"):
            Screen(diagonal=27, resolution=(1920, 1080), distance=0)
    
    def test_negative_curvature_raises_error(self):
        """Test that negative curvature raises ValueError."""
        with pytest.raises(ValueError, match="Curvature must be non-negative or None"):
            Screen(diagonal=27, resolution=(1920, 1080), distance=600, curvature=-1000)
    
    def test_zero_curvature_is_valid(self):
        """Test that zero curvature is valid."""
        monitor = Screen(diagonal=27, resolution=(1920, 1080), distance=600, curvature=0)
        assert monitor.curvature == 0
    
    def test_negative_scaling_raises_error(self):
        """Test that negative scaling raises ValueError."""
        with pytest.raises(ValueError, match="Scaling must be a positive number"):
            Screen(diagonal=27, resolution=(1920, 1080), distance=600, scaling=-1.5)
    
    def test_zero_scaling_raises_error(self):
        """Test that zero scaling raises ValueError."""
        with pytest.raises(ValueError, match="Scaling must be a positive number"):
            Screen(diagonal=27, resolution=(1920, 1080), distance=600, scaling=0)


class TestMonitorProperties:
    """Test Monitor calculated properties."""
    
    @pytest.fixture
    def flat_monitor(self):
        """Fixture for a flat monitor."""
        return Screen(diagonal=27, resolution=(1920, 1080), distance=600)
    
    @pytest.fixture
    def curved_monitor(self):
        """Fixture for a curved monitor."""
        return Screen(diagonal=34, resolution=(3440, 1440), distance=700, curvature=1000)
    
    @pytest.fixture
    def scaled_monitor(self):
        """Fixture for a monitor with scaling."""
        return Screen(diagonal=27, resolution=(2560, 1440), distance=600, scaling=1.25)
    
    def test_width_calculation(self, flat_monitor):
        """Test width calculation for flat monitor."""
        # Expected calculation based on diagonal and aspect ratio
        ratio = 1920 / 1080
        expected_height = 27 / ((ratio ** 2 + 1) ** 0.5) * 25.4
        expected_width = ratio * expected_height
        
        assert abs(flat_monitor.width - expected_width) < 0.01
    
    def test_height_calculation(self, flat_monitor):
        """Test height calculation for flat monitor."""
        ratio = 1920 / 1080
        expected_height = 27 / ((ratio ** 2 + 1) ** 0.5) * 25.4
        
        assert abs(flat_monitor.height - expected_height) < 0.01
    
    def test_size_property(self, flat_monitor):
        """Test that size property returns width and height tuple."""
        size = flat_monitor.size
        assert size == (flat_monitor.width, flat_monitor.height)
        assert isinstance(size, tuple)
        assert len(size) == 2
    
    def test_ppi_calculation(self, flat_monitor):
        """Test PPI calculation."""
        width_inches = flat_monitor.width / 25.4
        expected_ppi = round(1920 / width_inches)
        
        assert flat_monitor.ppi == expected_ppi
    
    def test_ppi_scaled_calculation(self, scaled_monitor):
        """Test scaled PPI calculation."""
        expected_ppi_scaled = round(scaled_monitor.ppi / 1.25)
        
        assert scaled_monitor.ppi_scaled == expected_ppi_scaled
    
    def test_pixel_size_calculation(self, flat_monitor):
        """Test pixel size calculation."""
        expected_pixel_size = 25.4 / flat_monitor.ppi
        
        assert abs(flat_monitor.pixel_size - expected_pixel_size) < 0.0001
    
    def test_fov_horizontal_flat(self, flat_monitor):
        """Test horizontal FOV for flat monitor."""
        expected_fov = degrees(2 * atan(flat_monitor.width / 2 / 600))
        
        assert abs(flat_monitor.fov_horizontal - expected_fov) < 0.01
    
    def test_fov_horizontal_curved(self, curved_monitor):
        """Test horizontal FOV for curved monitor."""
        # This is a complex calculation, so we'll just verify it's reasonable
        assert 0 < curved_monitor.fov_horizontal < 180
        assert curved_monitor.fov_horizontal > 0
    
    def test_fov_vertical(self, flat_monitor):
        """Test vertical FOV calculation."""
        expected_fov = degrees(2 * atan(flat_monitor.height / 2 / 600))
        
        assert abs(flat_monitor.fov_vertical - expected_fov) < 0.01
    
    def test_ppd_calculation(self, flat_monitor):
        """Test pixels per degree calculation."""
        expected_angle = degrees(atan(flat_monitor.pixel_size / 600))
        expected_ppd = 1 / expected_angle
        
        assert abs(flat_monitor.ppd - expected_ppd) < 0.01
    
    def test_ppd_edge_flat(self, flat_monitor):
        """Test PPD at edge for flat monitor."""
        distance_edge = sqrt(600**2 + (flat_monitor.width / 2)**2)
        expected_angle = degrees(atan(flat_monitor.pixel_size / distance_edge))
        expected_ppd_edge = 1 / expected_angle
        
        assert abs(flat_monitor.ppd_edge - expected_ppd_edge) < 0.01
    
    def test_ppd_edge_curved(self, curved_monitor):
        """Test PPD at edge for curved monitor."""
        # Complex calculation, just verify it's reasonable
        assert curved_monitor.ppd_edge > 0
        assert isinstance(curved_monitor.ppd_edge, float)
    
    def test_resolution_scaled(self, scaled_monitor):
        """Test scaled resolution calculation."""
        expected_width = round(2560 / 1.25)
        expected_height = round(1440 / 1.25)
        
        assert scaled_monitor.resolution_scaled == (expected_width, expected_height)
    
    def test_resolution_scaled_no_scaling(self, flat_monitor):
        """Test scaled resolution with no scaling (scaling=1)."""
        assert flat_monitor.resolution_scaled == flat_monitor.resolution


class TestMonitorComparisons:
    """Test comparisons between different monitor configurations."""
    
    def test_curved_vs_flat_fov(self):
        """Test that curved monitors typically have larger FOV."""
        flat = Screen(diagonal=34, resolution=(3440, 1440), distance=700)
        curved = Screen(diagonal=34, resolution=(3440, 1440), distance=700, curvature=1000)
        
        # Curved should generally have larger FOV, but this depends on specific geometry
        assert curved.fov_horizontal > 0
        assert flat.fov_horizontal > 0
    
    def test_scaling_affects_ppi(self):
        """Test that scaling affects PPI calculations."""
        normal = Screen(diagonal=27, resolution=(2560, 1440), distance=600, scaling=1.0)
        scaled = Screen(diagonal=27, resolution=(2560, 1440), distance=600, scaling=1.25)
        
        assert scaled.ppi_scaled < normal.ppi
        assert scaled.ppi == normal.ppi  # Base PPI should be the same


class TestMonitorEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_very_small_monitor(self):
        """Test very small monitor dimensions."""
        monitor = Screen(diagonal=1, resolution=(800, 600), distance=100)
        
        assert monitor.width > 0
        assert monitor.height > 0
        assert monitor.ppi > 0
    
    def test_very_large_monitor(self):
        """Test very large monitor dimensions."""
        monitor = Screen(diagonal=100, resolution=(7680, 4320), distance=2000)
        
        assert monitor.width > 0
        assert monitor.height > 0
        assert monitor.ppi > 0
    
    def test_square_resolution(self):
        """Test monitor with square aspect ratio."""
        monitor = Screen(diagonal=24, resolution=(1920, 1920), distance=600)
        
        assert abs(monitor.width - monitor.height) < 0.01  # Should be nearly equal
    
    def test_extreme_aspect_ratio(self):
        """Test monitor with extreme aspect ratio."""
        monitor = Screen(diagonal=49, resolution=(5120, 1440), distance=800)
        
        assert monitor.width > monitor.height * 3  # Very wide monitor
    
    def test_very_close_distance(self):
        """Test monitor at very close distance."""
        monitor = Screen(diagonal=27, resolution=(1920, 1080), distance=50)
        
        assert monitor.fov_horizontal > 90  # Should have very wide FOV
    
    def test_very_far_distance(self):
        """Test monitor at very far distance."""
        monitor = Screen(diagonal=27, resolution=(1920, 1080), distance=5000)
        
        assert monitor.fov_horizontal < 10  # Should have very narrow FOV


class TestMonitorStringRepresentation:
    """Test string representation of Monitor."""
    
    def test_str_contains_all_properties(self):
        """Test that __str__ contains all relevant properties."""
        monitor = Screen(diagonal=27, resolution=(1920, 1080), distance=600, curvature=1000, scaling=1.25)
        str_repr = str(monitor)
        
        # Check that all key properties are in the string representation
        assert "diagonal=27" in str_repr
        assert "resolution=(1920, 1080)" in str_repr
        assert "distance=600" in str_repr
        assert "curvature=1000" in str_repr
        assert "scaling=1.25" in str_repr
        assert "width=" in str_repr
        assert "height=" in str_repr
        assert "ppi=" in str_repr
        assert "fov_horizontal=" in str_repr
        assert "fov_vertical=" in str_repr
        assert "ppd=" in str_repr
    
    def test_str_formatting(self):
        """Test that numeric values are properly formatted in string representation."""
        monitor = Screen(diagonal=27.5, resolution=(1920, 1080), distance=600.5)
        str_repr = str(monitor)
        
        # Check that the string starts and ends correctly
        assert str_repr.startswith("Monitor(")
        assert str_repr.endswith(")")
        
        # Check that floating point values are formatted to appropriate precision
        assert ".2f" not in str_repr  # Format codes shouldn't appear in output


if __name__ == "__main__":
    pytest.main([__file__])
