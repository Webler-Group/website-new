#include <iostream>
#include <string>
#include <fmt/core.h>
#include <Eigen/Dense>
#include <boost/algorithm/string.hpp>
#include <glm/glm.hpp>
#include <GL/osmesa.h>
#include <GL/gl.h>
#include <stb/stb_image_write.h>
#include <vector>

int main() {
    std::string name;
    std::getline(std::cin, name);
    boost::algorithm::trim(name);

    Eigen::Matrix2d m; m << 2, 1, 1, 3;
    glm::vec3 v(1, 2, 2);

    // Offscreen software rendering via OSMesa
    OSMesaContext ctx = OSMesaCreateContext(OSMESA_RGBA, nullptr);
    std::vector<unsigned char> buf(64 * 64 * 4);
    bool gl = ctx && OSMesaMakeCurrent(ctx, buf.data(), GL_UNSIGNED_BYTE, 64, 64);
    if (gl) {
        glClearColor(0.1f, 0.1f, 0.2f, 1); glClear(GL_COLOR_BUFFER_BIT);
        glBegin(GL_TRIANGLES);
        glColor3f(1, 0, 0); glVertex2f(-0.8f, -0.8f);
        glColor3f(0, 1, 0); glVertex2f(0.8f, -0.8f);
        glColor3f(0, 0, 1); glVertex2f(0.0f, 0.8f);
        glEnd();
        glFinish();
        // OpenGL's origin is bottom-left, PNG's is top-left
        stbi_flip_vertically_on_write(1);
        stbi_write_png("output/frame.png", 64, 64, 4, buf.data(), 64 * 4);
    }

    fmt::print("hello {} det={} len={} gl={}\n", name, m.determinant(), glm::length(v),
               gl ? (const char*)glGetString(GL_RENDERER) : "none");
    if (ctx) OSMesaDestroyContext(ctx);
}
