/*
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
package crystals;

public class Partikel {
    float x,y,dichte,z = 1;
    float vx,vy,vz;
    int r,g,b;
    float durchmesser;

    public Partikel(float x, float y, int r, int g, int b,float dichte,int groesse) {
        this.x = x + (float)Math.random();
        this.y = y + (float)Math.random();
        this.r = r;
        this.g = g;
        this.b = b;
        this.dichte = dichte;
        durchmesser = (float)Math.random()*groesse+7;
        vy = (float)(Math.random()*5000-2500)*3/(4*(durchmesser/2)*(durchmesser/2)*(durchmesser/2)*3.14f*dichte);
        vx = (float)(Math.random()*5000-2500)*3/(4*(durchmesser/2)*(durchmesser/2)*(durchmesser/2)*3.14f*dichte);
        vz = 0;
    }
    
    
    public void update(){
        float ax = 4.5f*(1.82f*0.00001f*vx)/((durchmesser/2)*(durchmesser/2)*dichte);
        float ay = 4.5f*(1.82f*0.00001f*vy)/((durchmesser/2)*(durchmesser/2)*dichte);
        vx=vx-ax;
        vy=vy-ay;
        vz -= 0.0000018;
        z += vz;
        x = x + vx;
        y = y + vy;
    }
    
    
}
