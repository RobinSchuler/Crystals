/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

/**
 *
 * @author Bernd
 */
public class DynamicLightSettings {
    //toggle alles
    static boolean an = false;
    //zwergelampen
    static double lampenflackerWahrscheinlicheit = 0.00001;
    static double lampenflackerEndWahrscheinlicheit = 0.005;
    static int lampenMinDunkelheit = 10;
    static float lampenHelligkeitsaenderung = 0.4f;
    static int lampenMaxDunkelheit = 100;
    //allgemein
    static int maxShadow = 210;
    static float increaseShadow = .5f;
    static float increaseShadowinWall = 2f;
    static int granualitaet = 25; // == aufloesung      10fancy 25normal 50schlecht
    static float rotscaling = 0.07f;
    static float gruenscaling = 0;
    static float blauscaling = 0f;
}
