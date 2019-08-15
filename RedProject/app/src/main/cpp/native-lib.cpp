#include <jni.h>
#include <string>
#include <opencv2/opencv.hpp>
using namespace cv;

extern "C" JNIEXPORT jstring JNICALL
Java_com_ff0000_redproject_MainActivity_stringFromJNI(
        JNIEnv *env,
        jobject /* this */) {
    std::string hello = "Hello from C++";
    return env->NewStringUTF(hello.c_str());
}

extern "C"
JNIEXPORT void JNICALL
Java_com_ff0000_redproject_MainActivity_detectEdgeJNI(JNIEnv *env, jobject instance,
                                                      jlong inputImage, jlong outputImage, jint th1,
                                                      jint th2) {

    // TODO
    Mat &inputMat = *(Mat *) inputImage;
    Mat &outputMat = *(Mat *) outputImage;

    cvtColor(inputMat, outputMat, COLOR_RGB2GRAY);
    Canny(outputMat, outputMat, th1, th2);
}