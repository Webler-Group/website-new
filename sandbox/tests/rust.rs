use std::io::stdin;
use image::{Rgba, RgbaImage};
use imageproc::drawing::draw_filled_circle_mut;

fn main() {
    let mut name = String::new();
    stdin().read_line(&mut name).unwrap();

    // Offscreen OpenGL through the pre-built `osmesa` + `gl` crates
    let (w, h) = (64usize, 64usize);
    let mut pixels = vec![0u8; w * h * 4];
    unsafe {
        let ctx = osmesa::OSMesaCreateContext(osmesa::OSMESA_RGBA, std::ptr::null_mut());
        assert!(!ctx.is_null(), "no OSMesa context");
        osmesa::OSMesaMakeCurrent(ctx, pixels.as_mut_ptr().cast(), osmesa::GL_UNSIGNED_BYTE, w as i32, h as i32);
        gl::load_with(osmesa::get_proc_address);
        // A modern (GL 1.5+) function: fails the test if loading is broken
        let mut vbo = 0;
        gl::GenBuffers(1, &mut vbo);
        assert!(vbo != 0, "glGenBuffers failed");
        gl::ClearColor(0.0, 0.0, 1.0, 1.0);
        gl::Clear(gl::COLOR_BUFFER_BIT);
        gl::Finish();
        osmesa::OSMesaDestroyContext(ctx);
    }
    assert_eq!(&pixels[..4], &[0, 0, 255, 255], "GL clear color not rendered");

    // image + imageproc on top of the rendered buffer
    let mut img = RgbaImage::from_raw(w as u32, h as u32, pixels).unwrap();
    draw_filled_circle_mut(&mut img, (32, 32), 20, Rgba([255, 200, 0, 255]));
    img.save("output/circle.png").unwrap();

    println!("hello {}", name.trim());
}
