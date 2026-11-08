fn main() { gl::load_with(osmesa::get_proc_address); let _ = (image::RgbImage::new(1, 1), imageproc::drawing::draw_line_segment_mut::<image::RgbImage>); }
