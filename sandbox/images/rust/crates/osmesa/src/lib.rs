//! Raw bindings to Mesa's OSMesa: offscreen OpenGL rendering into a buffer you own.
//! Names and values match `<GL/osmesa.h>`, so C/C++ examples translate one to one.
//!
//! ```no_run
//! let (w, h) = (320, 240);
//! let mut pixels = vec![0u8; w * h * 4];
//! let attribs = [osmesa::OSMESA_FORMAT, osmesa::OSMESA_RGBA as i32, osmesa::OSMESA_DEPTH_BITS, 24,
//!     osmesa::OSMESA_PROFILE, osmesa::OSMESA_CORE_PROFILE,
//!     osmesa::OSMESA_CONTEXT_MAJOR_VERSION, 3, osmesa::OSMESA_CONTEXT_MINOR_VERSION, 3, 0];
//! unsafe {
//!     let ctx = osmesa::OSMesaCreateContextAttribs(attribs.as_ptr(), std::ptr::null_mut());
//!     osmesa::OSMesaMakeCurrent(ctx, pixels.as_mut_ptr().cast(), osmesa::GL_UNSIGNED_BYTE, w as i32, h as i32);
//! }
//! gl::load_with(osmesa::get_proc_address);
//! ```
#![allow(non_camel_case_types, non_snake_case)]

use std::ffi::{CString, c_char, c_int, c_uint, c_void};

#[repr(C)]
pub struct osmesa_context {
    _private: [u8; 0],
}
pub type OSMesaContext = *mut osmesa_context;
pub type GLenum = c_uint;
pub type GLint = c_int;
pub type GLboolean = u8;
pub type OSMESAproc = Option<unsafe extern "C" fn()>;

pub const GL_UNSIGNED_BYTE: GLenum = 0x1401;
pub const GL_FLOAT: GLenum = 0x1406;

// Pixel formats
pub const OSMESA_RGBA: GLenum = 0x1908; // GL_RGBA
pub const OSMESA_BGRA: GLenum = 0x1;
pub const OSMESA_ARGB: GLenum = 0x2;
pub const OSMESA_RGB: GLenum = 0x1907; // GL_RGB
pub const OSMESA_BGR: GLenum = 0x4;
pub const OSMESA_RGB_565: GLenum = 0x5;

// OSMesaPixelStore / OSMesaGetIntegerv
pub const OSMESA_ROW_LENGTH: GLint = 0x10;
pub const OSMESA_Y_UP: GLint = 0x11;
pub const OSMESA_WIDTH: GLint = 0x20;
pub const OSMESA_HEIGHT: GLint = 0x21;
pub const OSMESA_FORMAT: GLint = 0x22;
pub const OSMESA_TYPE: GLint = 0x23;
pub const OSMESA_MAX_WIDTH: GLint = 0x24;
pub const OSMESA_MAX_HEIGHT: GLint = 0x25;

// OSMesaCreateContextAttribs
pub const OSMESA_DEPTH_BITS: GLint = 0x30;
pub const OSMESA_STENCIL_BITS: GLint = 0x31;
pub const OSMESA_ACCUM_BITS: GLint = 0x32;
pub const OSMESA_PROFILE: GLint = 0x33;
pub const OSMESA_CORE_PROFILE: GLint = 0x34;
pub const OSMESA_COMPAT_PROFILE: GLint = 0x35;
pub const OSMESA_CONTEXT_MAJOR_VERSION: GLint = 0x36;
pub const OSMESA_CONTEXT_MINOR_VERSION: GLint = 0x37;

#[link(name = "OSMesa")]
unsafe extern "C" {
    pub fn OSMesaCreateContext(format: GLenum, sharelist: OSMesaContext) -> OSMesaContext;
    pub fn OSMesaCreateContextExt(
        format: GLenum,
        depthBits: GLint,
        stencilBits: GLint,
        accumBits: GLint,
        sharelist: OSMesaContext,
    ) -> OSMesaContext;
    pub fn OSMesaCreateContextAttribs(attribList: *const c_int, sharelist: OSMesaContext) -> OSMesaContext;
    pub fn OSMesaDestroyContext(ctx: OSMesaContext);
    pub fn OSMesaMakeCurrent(ctx: OSMesaContext, buffer: *mut c_void, type_: GLenum, width: GLint, height: GLint)
        -> GLboolean;
    pub fn OSMesaGetCurrentContext() -> OSMesaContext;
    pub fn OSMesaPixelStore(pname: GLint, value: GLint);
    pub fn OSMesaGetIntegerv(pname: GLint, value: *mut GLint);
    pub fn OSMesaGetProcAddress(funcName: *const c_char) -> OSMESAproc;
}

/// Looks up an OpenGL function for a loader, e.g. `gl::load_with(osmesa::get_proc_address)`.
pub fn get_proc_address(name: &str) -> *const c_void {
    let Ok(name) = CString::new(name) else { return std::ptr::null() };
    unsafe { OSMesaGetProcAddress(name.as_ptr()) }.map_or(std::ptr::null(), |f| f as *const c_void)
}
